import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { handleApiError } from '../utils/api';
import { buildApiUrl, getAuthHeaders } from '../config/api.config';
import { clearUserCache } from '../components/UserHoverCard';
import { Calendar, Trophy, MessageSquare, CreditCard, Star, CheckCircle, Briefcase, Settings, Shield, Camera, Upload, Crop, RotateCcw, Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import UserLevelBadge from '../components/UserLevelBadge';
import { getPointsToNextLevel, getUserLevel } from '../utils/userUtils';
import { POINTS_SYSTEM, INDUSTRY_ROLES, USER_LEVELS } from '../data/constants';
import ReactCrop, { Crop as CropType, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import AvatarCropper from '../components/AvatarCropper';
import BrowserCompatibleModal from '../components/BrowserCompatibleModal';
import RealTimeAvatar from '../components/RealTimeAvatar';
import { debugLog } from '../utils/debug';

const UserProfile: React.FC = () => {
  const { user, updateUserPoints, updateUser, getForumPosts, onAvatarUpdate } = useAuth();
  const [isBackendAvailable, setIsBackendAvailable] = useState(true);
  const [forumPosts, setForumPosts] = useState<any[]>([]);
  const [userStats, setUserStats] = useState({
    totalPosts: 0,
    totalReplies: 0,
    consecutiveCheckins: 0
  });
  
  // 检查后端连接状态
  useEffect(() => {
    const checkBackendConnection = async () => {
      try {
        const health = await fetch(buildApiUrl('/health'));
        if (health.ok) {
          setIsBackendAvailable(true);
        } else {
          setIsBackendAvailable(false);
        }
      } catch (error) {
        setIsBackendAvailable(false);
      }
    };
    
    checkBackendConnection();
  }, []);

  // 获取论坛帖子数据
  useEffect(() => {
    const loadForumPosts = async () => {
      try {
        const posts = await getForumPosts();
        setForumPosts(posts || []);
      } catch (error) {
        console.error('Failed to load forum posts:', error);
        setForumPosts([]);
      }
    };
    
    loadForumPosts();
  }, [getForumPosts]);

  // 获取用户统计数据
  useEffect(() => {
    const loadUserStats = async () => {
      if (!user || !isBackendAvailable) return;
      
      try {
        const token = localStorage.getItem('oldksports_auth_token');
        if (!token) return;
        
        const response = await fetch(buildApiUrl('/user-stats/me'), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setUserStats(data.data);
        } else {
          console.warn('Failed to load user stats from backend');
        }
      } catch (error) {
        console.error('Failed to load user stats:', error);
      }
    };
    
    loadUserStats();
  }, [user, isBackendAvailable]);
  
  
  const [hasCheckedInToday, setHasCheckedInToday] = React.useState(false);
  const [isCheckingIn, setIsCheckingIn] = React.useState(false);
  const [isEditingAvatar, setIsEditingAvatar] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [imageSrc, setImageSrc] = React.useState<string>('');
  const [crop, setCrop] = React.useState<CropType>();
  const [completedCrop, setCompletedCrop] = React.useState<CropType>();
  const [imgRef, setImgRef] = React.useState<HTMLImageElement | null>(null);
  const [croppedImageUrl, setCroppedImageUrl] = React.useState<string>('');
  const [showCropper, setShowCropper] = React.useState(false);
  const [showRoleEditor, setShowRoleEditor] = React.useState(false);
  const [selectedRoles, setSelectedRoles] = React.useState<string[]>([]);
  const [isSavingRoles, setIsSavingRoles] = React.useState(false);
  const [isEditingUsername, setIsEditingUsername] = React.useState(false);
  const [usernameInput, setUsernameInput] = React.useState('');
  const [isSavingUsername, setIsSavingUsername] = React.useState(false);
  const [usernameError, setUsernameError] = React.useState('');
  
  // 检测浏览器类型
  const isSogouBrowser = React.useMemo(() => {
    return navigator.userAgent.includes('MetaSr') || navigator.userAgent.includes('Sogou');
  }, []);
  
  // 搜狗浏览器特殊处理
  React.useEffect(() => {
    if (isSogouBrowser) {
      debugLog('检测到搜狗浏览器，启用兼容性模式');
    }
  }, [isSogouBrowser]);

  React.useEffect(() => {
    if (user?.username && !isEditingUsername) {
      setUsernameInput(user.username);
    }
  }, [user?.username, isEditingUsername]);

  // 初始化selectedRoles - 确保始终是数组类型
  React.useEffect(() => {
    if (user?.roles) {
      // 确保 roles 是数组类型，如果不是则转换为数组或设为空数组
      if (Array.isArray(user.roles)) {
        setSelectedRoles(user.roles);
      } else if (typeof user.roles === 'string') {
        // 如果是字符串，尝试解析为JSON
        try {
          const parsed = JSON.parse(user.roles);
          setSelectedRoles(Array.isArray(parsed) ? parsed : []);
        } catch {
          setSelectedRoles([]);
        }
      } else {
        // 其他类型（null, undefined, 数字, 对象等）都设为空数组
        setSelectedRoles([]);
      }
    } else {
      // 如果 user.roles 不存在，设为空数组
      setSelectedRoles([]);
    }
  }, [user?.roles]);
  
  // 添加头像更新监听器
  const [avatarKey, setAvatarKey] = React.useState(Date.now());
  
  // 强制重新加载用户数据
  React.useEffect(() => {
    debugLog('UserProfile组件加载，当前用户状态:', user);
    
    // 检查localStorage中的用户数据
    const storedUser = localStorage.getItem('oldksports_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        debugLog('localStorage中的用户数据:', parsedUser);
        
        // 如果localStorage中有头像但当前user对象没有，自动修复
        if (parsedUser.avatar && !user?.avatar) {
          debugLog('发现数据不一致，自动修复头像数据');
          debugLog('localStorage头像长度:', parsedUser.avatar?.length);
          debugLog('当前用户头像长度:', user?.avatar?.length);
          
          // 自动触发数据同步（使用非async方式）
          updateUser({
            avatar: parsedUser.avatar, 
            hasUploadedAvatar: parsedUser.hasUploadedAvatar || true
          }).then(() => {
            setAvatarKey(Date.now());
            debugLog('自动修复成功');
          }).catch((error) => {
            console.error('自动修复失败:', error);
            // 如果自动修复失败，提示用户手动操作
            setTimeout(() => {
              alert('检测到头像数据不一致，请点击"重新获取"按钮修复');
            }, 1000);
          });
        }
      } catch (e) {
        console.error('解析localStorage用户数据失败:', e);
      }
    }
  }, [user, updateUser]);
  
  React.useEffect(() => {
    // 监听头像更新事件
    const handleAvatarUpdate = (updatedUser: any) => {
      debugLog('头像更新事件触发，更新的用户:', updatedUser);
      setAvatarKey(Date.now()); // 强制刷新头像显示
    };
    
    // 注册AuthContext的头像更新监听器
    const unsubscribe = onAvatarUpdate ? onAvatarUpdate(handleAvatarUpdate) : () => {};
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [onAvatarUpdate]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">请先登录</h2>
          <Link to="/login" className="text-blue-500 hover:text-blue-400">
            前往登录
          </Link>
        </div>
      </div>
    );
  }

  React.useEffect(() => {
    // Check if user has already checked in today
    const lastCheckin = localStorage.getItem(`checkin_${user.id}`);
    const today = new Date().toDateString();
    setHasCheckedInToday(lastCheckin === today);
  }, [user.id]);

  const handleCheckin = async () => {
    if (hasCheckedInToday || isCheckingIn) return;
    
    setIsCheckingIn(true);
    
    try {
      await updateUserPoints(POINTS_SYSTEM.DAILY_CHECKIN);
      
      // Mark as checked in today
      const today = new Date().toDateString();
      localStorage.setItem(`checkin_${user.id}`, today);
      setHasCheckedInToday(true);
      setIsCheckingIn(false);
      
      // Check if user leveled up
      const oldLevel = user.level;
      const newPoints = user.points + POINTS_SYSTEM.DAILY_CHECKIN;
      const newLevel = USER_LEVELS.slice().reverse().find(level => newPoints >= level.minPoints);
      
      if (newLevel && newLevel.id !== oldLevel.id) {
        alert(`恭喜！您升级了！\n从 ${oldLevel.name} 升级到 ${newLevel.name}\n获得 ${POINTS_SYSTEM.DAILY_CHECKIN} 积分奖励`);
      } else {
        alert(`签到成功！获得 ${POINTS_SYSTEM.DAILY_CHECKIN} 积分奖励`);
      }
    } catch (error) {
      console.error('Checkin failed:', error);
      alert('签到失败，请重试');
      setIsCheckingIn(false);
    }
  };

  const handleAvatarSave = async () => {
    if (user && croppedImageUrl) {
      setIsUploading(true);
      
      debugLog('Saving avatar with URL:', croppedImageUrl);
      debugLog('URL type:', typeof croppedImageUrl);
      debugLog('URL length:', croppedImageUrl.length);
      debugLog('URL starts with data:image:', croppedImageUrl.startsWith('data:image'));
      
      // 强制压缩头像到VARCHAR(255)限制内 - 多重压缩策略
      const compressAvatar = (dataUrl: string): Promise<string> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // 多重压缩策略：从大到小尝试，提供更好的用户体验
            const compressionLevels = [
              { maxSize: 120, quality: 0.8 },  // 第一级：120px, 80%质量 - 高质量
              { maxSize: 100, quality: 0.6 },  // 第二级：100px, 60%质量 - 中等质量
              { maxSize: 80, quality: 0.4 },   // 第三级：80px, 40%质量 - 较低质量
              { maxSize: 60, quality: 0.3 },   // 第四级：60px, 30%质量 - 低质量
              { maxSize: 50, quality: 0.2 },   // 第五级：50px, 20%质量 - 很低质量
              { maxSize: 40, quality: 0.1 },   // 第六级：40px, 10%质量 - 极低质量
              { maxSize: 30, quality: 0.05 }   // 第七级：30px, 5%质量 - 极限质量
            ];
            
            let bestResult = '';
            let currentLevel = 0;
            
            const tryCompression = () => {
              if (currentLevel >= compressionLevels.length) {
                // 所有级别都尝试过了，返回最后一个结果
                debugLog('所有压缩级别都尝试过了，最终长度:', bestResult.length);
                resolve(bestResult);
                return;
              }
              
              const { maxSize, quality } = compressionLevels[currentLevel];
              let { width, height } = img;
              
              if (width > height) {
                if (width > maxSize) {
                  height = (height * maxSize) / width;
                  width = maxSize;
                }
              } else {
                if (height > maxSize) {
                  width = (width * maxSize) / height;
                  height = maxSize;
                }
              }
              
              canvas.width = width;
              canvas.height = height;
              ctx.drawImage(img, 0, 0, width, height);
              
              const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
              debugLog(`压缩级别${currentLevel + 1}: ${maxSize}px, 质量${quality}, 长度: ${compressedDataUrl.length}`);
              
              // 检查长度限制 - 如果数据库字段已修改为TEXT，则使用更宽松的限制
              const maxLength = 10000; // TEXT字段可以支持更长的数据
              if (compressedDataUrl.length <= maxLength) {
                debugLog('压缩成功！长度:', compressedDataUrl.length);
                resolve(compressedDataUrl);
              } else {
                bestResult = compressedDataUrl;
                currentLevel++;
                setTimeout(tryCompression, 0); // 异步尝试下一级别
              }
            };
            
            tryCompression();
          };
          img.onerror = reject;
          img.src = dataUrl;
        });
      };
      
      try {
        // 强制压缩头像
        const compressedAvatar = await compressAvatar(croppedImageUrl);
        
        if (compressedAvatar.length > 10000) {
          alert(`头像图片过大（${compressedAvatar.length}字符），请选择更小的图片或使用更简单的图片`);
          setIsUploading(false);
          return;
        }
        // 添加时间戳避免缓存问题
        const timestampedAvatar = `${croppedImageUrl}#${Date.now()}`;
        
        // 使用 updateUser 方法更新用户信息
        const updateData = {
          avatar: compressedAvatar, // 使用压缩后的头像URL
          hasUploadedAvatar: true
        };
        
        debugLog('Calling updateUser with:', updateData);
        
        // 先保存到localStorage，确保数据不丢失
        const fallbackUser = { ...user, ...updateData };
        localStorage.setItem('oldksports_user', JSON.stringify(fallbackUser));
        debugLog('头像数据已保存到localStorage:', fallbackUser);
        
        // 使用AuthContext的updateUser方法来实现实时更新
        try {
          await updateUser(updateData);
          debugLog('Avatar updated successfully via AuthContext');
          
          // 立即刷新头像显示 - 多重保障
          setAvatarKey(Date.now());
          
          // 强制触发一次状态更新
          setTimeout(() => {
            setAvatarKey(Date.now());
            debugLog('第一次延迟刷新头像');
          }, 100);
          
          // 再次确保头像更新
          setTimeout(() => {
            setAvatarKey(Date.now());
            debugLog('第二次延迟刷新头像');
          }, 300);
          
        } catch (apiError) {
          console.warn('API update failed, using direct state update:', apiError);
          
          // API失败时，确保localStorage数据是最新的
          localStorage.setItem('oldksports_user', JSON.stringify(fallbackUser));
          debugLog('API失败，使用localStorage回退方案');
          
          // 立即刷新头像显示
          setAvatarKey(Date.now());
          
          // 显示成功提示，即使API失败
          alert('头像已保存到本地，刷新页面后生效');
          
          // 延迟刷新页面确保状态同步
          setTimeout(() => {
            debugLog('API失败，使用页面刷新确保状态同步');
            window.location.reload();
          }, 500);
        }
        
        // 检查是否为首次上传头像 - 从数据库验证
        let shouldGivePoints = false;
        try {
          // 直接查询数据库获取准确的has_uploaded_avatar状态
          const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/users/${user.username || 'unknown'}/info`);
          const dbData = await response.json();
          
          if (dbData.success && dbData.user) {
            const dbHasUploadedAvatar = dbData.user.hasUploadedAvatar;
            debugLog('数据库中的头像状态:', {
              dbHasUploadedAvatar,
              dbHasUploadedAvatarType: typeof dbHasUploadedAvatar,
              userHasUploadedAvatar: user.hasUploadedAvatar,
              userHasUploadedAvatarType: typeof user.hasUploadedAvatar
            });
            
            // 只有数据库中明确显示没有上传过头像才给积分
            shouldGivePoints = !dbHasUploadedAvatar || dbHasUploadedAvatar === 0 || dbHasUploadedAvatar === false || dbHasUploadedAvatar === '0';
          } else {
            // 如果无法获取数据库状态，使用前端状态（更保守的做法）
            shouldGivePoints = !user.hasUploadedAvatar;
          }
        } catch (error) {
          console.error('查询数据库头像状态失败:', error);
          // 查询失败时，不给积分（保守做法）
          shouldGivePoints = false;
        }
        
        debugLog('最终积分奖励决定:', shouldGivePoints);
        
        if (shouldGivePoints) {
          debugLog('首次上传头像，给予积分奖励');
          await updateUserPoints(POINTS_SYSTEM.UPLOAD_AVATAR);
          
          // Check if user leveled up
          const oldLevel = user.level;
          const newTotalPoints = user.points + POINTS_SYSTEM.UPLOAD_AVATAR;
          const newLevel = USER_LEVELS.slice().reverse().find(level => newTotalPoints >= level.minPoints);
          
          if (newLevel && newLevel.id !== oldLevel.id) {
            alert(`恭喜！您升级了！\n从 ${oldLevel.name} 升级到 ${newLevel.name}\n首次头像上传成功！获得 ${POINTS_SYSTEM.UPLOAD_AVATAR} 积分奖励`);
          } else {
            alert(`首次头像上传成功！获得 ${POINTS_SYSTEM.UPLOAD_AVATAR} 积分奖励`);
          }
        } else {
          debugLog('非首次上传头像，不给积分');
          alert('头像更新成功！');
        }
        
        // 成功保存后立即关闭弹窗并刷新显示
        setIsUploading(false);
        setIsEditingAvatar(false);
        handleAvatarCancel();
        
        // 更新用户状态，确保头像立即生效
        if (shouldGivePoints) {
          // 首次上传，更新hasUploadedAvatar状态
          updateUser({ 
            ...user, 
            avatar: croppedImageUrl,
            hasUploadedAvatar: true,
            points: user.points + POINTS_SYSTEM.UPLOAD_AVATAR
          });
        } else {
          // 非首次上传，只更新头像
          updateUser({ 
            ...user, 
            avatar: croppedImageUrl
          });
        }
        
        // 额外的头像刷新机制
        setTimeout(() => {
          setAvatarKey(Date.now());
          debugLog('延迟刷新头像显示');
        }, 200);
      } catch (error) {
        console.error('Error saving avatar:', error);
        const errorMessage = handleApiError(error);
        alert(`头像保存失败: ${errorMessage}`);
        setIsUploading(false);
      }
    } else {
      alert('请先完成图片裁剪');
    }
  };

  const handleSaveUsername = async () => {
    if (!user) return;
    const trimmed = usernameInput.trim();
    if (!trimmed) {
      setUsernameError('用户名不能为空');
      return;
    }
    if (trimmed === user.username) {
      setIsEditingUsername(false);
      setUsernameError('');
      return;
    }

    setIsSavingUsername(true);
    setUsernameError('');
    try {
      await updateUser({ username: trimmed });
      setIsEditingUsername(false);
    } catch (error) {
      const message = handleApiError(error);
      setUsernameError(message || '更新用户名失败，请稍后再试');
    } finally {
      setIsSavingUsername(false);
    }
  };

  const handleSaveRoles = async () => {
    if (!user) return;
    
    // 确保 selectedRoles 是数组类型
    const safeSelectedRoles = Array.isArray(selectedRoles) ? selectedRoles : [];
    
    debugLog('保存身份信息:', { selectedRoles: safeSelectedRoles, user: user.username });
    
    setIsSavingRoles(true);
    try {
      // 使用统一的API工具函数
      const response = await fetch(buildApiUrl('/users/me'), {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include', // 确保包含cookies
        body: JSON.stringify({
          roles: safeSelectedRoles
        })
      });

      // 一些后端可能返回 204(No Content) 也代表成功；同时避免对空响应强制 json()
      if (response.ok || response.status === 204) {
        let result: any = null;
        try {
          // 尝试解析 JSON（若无内容会抛错，忽略即可）
          result = await response.json();
        } catch {}
        debugLog('更新成功:', result ?? { status: response.status });
        
        // 更新本地用户数据
        const updatedUser = { ...user, roles: safeSelectedRoles };
        await updateUser(updatedUser);
        
        // 清除用户卡片缓存，确保新身份信息能正确显示
        clearUserCache(user.username);
        
        setShowRoleEditor(false);
        alert('身份信息更新成功！');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('更新失败详情:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        throw new Error(`更新失败: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error('保存身份失败:', error);
      alert('保存失败，请重试');
    } finally {
      setIsSavingRoles(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 检查文件类型
      if (!file.type.startsWith('image/')) {
        alert('请选择图片文件');
        return;
      }
      
      // 检查文件大小 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('图片大小不能超过5MB');
        return;
      }
      
      setSelectedFile(file);
      
      // 创建预览URL
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        setImageSrc(imageUrl);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight, width, height } = e.currentTarget;
    setImgRef(e.currentTarget);
    
    // 创建居中的正方形裁剪区域，使用实际显示尺寸
    const displayWidth = width;
    const displayHeight = height;
    
    const crop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: Math.min(80, (displayHeight / displayWidth) * 80),
        },
        1, // 1:1 aspect ratio for square
        displayWidth,
        displayHeight
      ),
      displayWidth,
      displayHeight
    );
    
    setCrop(crop);
  };

  const compressImage = (canvas: HTMLCanvasElement, quality: number = 0.8): string => {
    // 先尝试高质量
    let dataURL = canvas.toDataURL('image/jpeg', quality);
    
    // 如果数据太大，逐步降低质量
    while (dataURL.length > 500000 && quality > 0.3) { // 500KB 限制
      quality -= 0.1;
      dataURL = canvas.toDataURL('image/jpeg', quality);
      debugLog(`Compressed image to quality ${quality}, size: ${dataURL.length}`);
    }
    
    return dataURL;
  };

  const getCroppedImg = (image: HTMLImageElement, crop: any): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        debugLog('Starting getCroppedImg...');
        debugLog('Image dimensions:', image.naturalWidth, 'x', image.naturalHeight);
        debugLog('Crop parameters:', crop);
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('无法获取2D绘图上下文');
        }
        
        if (!crop.width || !crop.height) {
          throw new Error('裁剪区域无效');
        }

        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;
        
        debugLog('Scale factors:', { scaleX, scaleY });
        
        // 计算实际像素值
        const pixelCrop = {
          x: crop.x * scaleX,
          y: crop.y * scaleY,
          width: crop.width * scaleX,
          height: crop.height * scaleY
        };
        
        debugLog('Pixel crop:', pixelCrop);
        
        // 限制最大尺寸为 200x200 像素
        const maxSize = 200;
        let width = pixelCrop.width;
        let height = pixelCrop.height;
        
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width *= ratio;
          height *= ratio;
          debugLog('Resized to:', { width, height });
        }
        
        canvas.width = width;
        canvas.height = height;

        debugLog('Canvas dimensions:', canvas.width, 'x', canvas.height);

        ctx.drawImage(
          image,
          pixelCrop.x,
          pixelCrop.y,
          pixelCrop.width,
          pixelCrop.height,
          0,
          0,
          width,
          height
        );

        debugLog('Image drawn to canvas successfully');

        // 使用压缩函数
        const dataURL = compressImage(canvas, 0.8);
        debugLog('Final image size:', dataURL.length);
        
        if (!dataURL || dataURL.length === 0) {
          throw new Error('生成的图片数据为空');
        }
        
        resolve(dataURL);
      } catch (error) {
        console.error('Error in getCroppedImg:', error);
        reject(error);
      }
    });
  };

  const handleCropComplete = async () => {
    debugLog('handleCropComplete called');
    debugLog('imgRef:', !!imgRef);
    debugLog('completedCrop:', completedCrop);
    debugLog('completedCrop.width:', completedCrop?.width);
    debugLog('completedCrop.height:', completedCrop?.height);
    
    if (imgRef && completedCrop && completedCrop.width && completedCrop.height) {
      try {
        debugLog('Starting image cropping...');
        const croppedImageUrl = await getCroppedImg(imgRef, completedCrop);
        debugLog('Image cropped successfully, URL length:', croppedImageUrl.length);
        setCroppedImageUrl(croppedImageUrl);
        setShowCropper(false);
      } catch (error) {
        console.error('Error cropping image:', error);
        alert('图片裁剪失败，请重试');
      }
    } else {
      debugLog('Crop validation failed');
      alert('请先选择裁剪区域');
    }
  };

  const handleAvatarCancel = () => {
    setSelectedFile(null);
    setIsEditingAvatar(false);
    setImageSrc('');
    setCroppedImageUrl('');
    setShowCropper(false);
    setCrop(undefined);
    setCompletedCrop(undefined);
  };

  // 确保用户等级正确计算
  const currentLevel = getUserLevel(user.points);
  const nextLevelIndex = USER_LEVELS.findIndex(level => level.id === currentLevel.id) + 1;
  
  // 计算距离下一等级所需的积分
  const pointsToNext = nextLevelIndex >= USER_LEVELS.length ? 0 : 
    Math.max(0, USER_LEVELS[nextLevelIndex].minPoints - user.points);
  
  // 计算进度百分比
  const progressPercentage = pointsToNext === 0 ? 100 : 
    nextLevelIndex < USER_LEVELS.length ? 
      Math.min(100, Math.max(0, ((user.points - currentLevel.minPoints) / (USER_LEVELS[nextLevelIndex].minPoints - currentLevel.minPoints)) * 100)) :
      100;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gradient-radial dark:from-slate-700 dark:to-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Profile Header */}
        <div className="bg-surface-variant/50 backdrop-blur-sm rounded-lg border border-border-surface p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-6">
            <div className="relative">
              <RealTimeAvatar 
                user={user}
                size="xl"
                className="mb-4 sm:mb-0"
                updateKey={avatarKey}
              />
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  debugLog('头像编辑按钮被点击，浏览器：', navigator.userAgent);
                  setIsEditingAvatar(true);
                  // 强制重新渲染
                  setTimeout(() => {
                    setIsEditingAvatar(true);
                  }, 10);
                }}
                className="absolute bottom-0 right-0 bg-white text-gray-600 p-2 rounded-full shadow-lg hover:bg-gray-50 transition-colors"
                style={{
                  position: 'absolute',
                  bottom: '0',
                  right: '0',
                  backgroundColor: 'white',
                  color: '#4b5563',
                  padding: '8px',
                  borderRadius: '50%',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                }}
                title="修改头像"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 mb-2 space-y-2 sm:space-y-0">
                {isEditingUsername ? (
                  <div className="flex items-center space-x-2">
                    <input
                      value={usernameInput}
                      onChange={(e) => {
                        setUsernameInput(e.target.value);
                        if (usernameError) setUsernameError('');
                      }}
                      maxLength={32}
                      className="px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    />
                    <button
                      onClick={handleSaveUsername}
                      disabled={isSavingUsername}
                      className="px-2.5 py-1 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      {isSavingUsername ? '保存中...' : '保存'}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingUsername(false);
                        setUsernameInput(user.username || '');
                        setUsernameError('');
                      }}
                      className="px-2.5 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <h1 className="text-2xl font-bold text-on-surface">{user.username}</h1>
                    <button
                      onClick={() => {
                        setUsernameInput(user.username || '');
                        setIsEditingUsername(true);
                      }}
                      className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      编辑用户名
                    </button>
                  </div>
                )}
                <UserLevelBadge level={user.level} />
              </div>
              {isEditingUsername && usernameError && (
                <p className="text-xs text-red-500 mb-1">{usernameError}</p>
              )}

              <p className="text-on-surface-variant mb-3">{user.email}</p>
              
              {/* User Roles */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-1">
                    <Briefcase className="w-4 h-4 text-on-surface-tertiary" />
                    <span className="text-sm text-on-surface-tertiary">行业身份</span>
                  </div>
                  <button
                    onClick={() => setShowRoleEditor(!showRoleEditor)}
                    className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    {showRoleEditor ? '取消' : '编辑'}
                  </button>
                </div>
                
                {showRoleEditor ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      {INDUSTRY_ROLES.map(role => {
                        // 确保 selectedRoles 始终是数组
                        const safeSelectedRoles = Array.isArray(selectedRoles) ? selectedRoles : [];
                        return (
                          <label key={role.id} className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={safeSelectedRoles.includes(role.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedRoles([...safeSelectedRoles, role.id]);
                                } else {
                                  setSelectedRoles(safeSelectedRoles.filter(id => id !== role.id));
                                }
                              }}
                              className="w-4 h-4 text-emerald-600 bg-gray-700 border-gray-600 rounded focus:ring-emerald-500 focus:ring-2"
                            />
                            <span className="text-sm text-on-surface-variant">{role.label}</span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSaveRoles}
                        disabled={isSavingRoles}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded transition-colors disabled:opacity-50"
                      >
                        {isSavingRoles ? '保存中...' : '保存'}
                      </button>
                      <button
                        onClick={() => {
                          setShowRoleEditor(false);
                          // 确保取消时恢复的 roles 是数组类型
                          const safeRoles = Array.isArray(user?.roles) ? user.roles : [];
                          setSelectedRoles(safeRoles);
                        }}
                        className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {user.roles && user.roles.length > 0 ? (
                      user.roles.map(roleId => {
                        const role = INDUSTRY_ROLES.find(r => r.id === roleId);
                        return role ? (
                          <span
                            key={roleId}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                          >
                            {role.label}
                          </span>
                        ) : null;
                      })
                    ) : (
                      <span className="text-sm text-gray-500">未设置身份</span>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-6 text-sm text-on-surface-tertiary">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>加入时间：{new Date(user.joinDate).toLocaleDateString('zh-CN')}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Trophy className="w-4 h-4" />
                  <span>{user.points} 积分</span>
                </div>
                {user.isAdmin && (
                  <div className="flex items-center space-x-1 text-red-400">
                    <Shield className="w-4 h-4" />
                    <span>管理员</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Daily Check-in Card */}
            <div className="mt-6 lg:mt-0 bg-surface-tertiary/30 backdrop-blur-sm rounded-lg border border-border-surface p-4 lg:w-56">
                              <h3 className="text-lg font-semibold text-on-surface mb-4 flex items-center">
                <CheckCircle className="w-5 h-5 text-emerald-400 mr-2" />
                每日签到
              </h3>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-emerald-600/20 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-500/30">
                  <CheckCircle className={`w-6 h-6 ${hasCheckedInToday ? 'text-emerald-400' : 'text-gray-400'}`} />
                </div>
                
                <p className="text-on-surface-variant mb-3 text-sm">
                  {hasCheckedInToday ? '今日已签到' : '完成签到获得积分奖励'}
                </p>
                
                <button
                  onClick={handleCheckin}
                  disabled={hasCheckedInToday || isCheckingIn}
                  className={`w-full px-4 py-2 rounded-lg font-semibold transition-colors text-sm ${
                    hasCheckedInToday 
                      ? 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {isCheckingIn ? '签到中...' : hasCheckedInToday ? '已签到' : `签到 (+${POINTS_SYSTEM.DAILY_CHECKIN}积分)`}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 头像编辑模态框 - 使用兼容性Modal */}
        <BrowserCompatibleModal 
          isOpen={isEditingAvatar} 
          onClose={handleAvatarCancel}
          isSogouBrowser={isSogouBrowser}
        >
            <div 
              className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-white/20 w-full max-w-3xl shadow-2xl max-h-screen overflow-y-auto"
              style={{
                maxHeight: '85vh',
                width: '100%',
                maxWidth: '768px',
                borderRadius: '12px',
                ...(isSogouBrowser && {
                  backgroundColor: document.documentElement.getAttribute('data-theme') === 'dark' 
                    ? 'rgb(30, 41, 59)' 
                    : 'rgba(255, 255, 255, 0.95)',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)'
                })
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div 
                className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-white/20"
              >
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                  <Camera className="w-6 h-6 mr-3 text-emerald-400" />
                  修改头像
                </h3>
                <button
                  onClick={handleAvatarCancel}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                {/* 确保内容在小屏幕上也能正常显示 */}
                <div className="flex flex-col justify-center py-4">
                {/* 头像预览区域 */}
                <div className="flex justify-center py-6">
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full border-4 border-emerald-500/30 overflow-hidden bg-gray-200 dark:bg-slate-700/50 shadow-xl">
                      {croppedImageUrl ? (
                        <img
                          src={croppedImageUrl}
                          alt="裁剪预览"
                          className="w-full h-full object-cover"
                          key={`cropped-${Date.now()}`}
                        />
                      ) : (
                        <div className="w-full h-full">
                          <RealTimeAvatar 
                            user={user}
                            size="xl"
                            className="w-full h-full border-0"
                            updateKey={avatarKey}
                          />
                        </div>
                      )}
                    </div>
                    {!user.hasUploadedAvatar && (
                      <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                        +10分
                      </div>
                    )}
                  </div>
                </div>

                {/* 文件上传区域 */}
                {!showCropper && !croppedImageUrl && (
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 dark:border-white/30 rounded-lg p-8 text-center hover:border-emerald-400/50 transition-colors bg-gray-50 dark:bg-slate-700/30">
                      <Upload className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-900 dark:text-white font-medium mb-2">上传头像图片</p>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">支持 JPG、PNG、GIF 格式，最大 5MB</p>
                      <label className="inline-flex items-center bg-emerald-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors cursor-pointer shadow-lg hover:shadow-xl">
                        <Camera className="w-5 h-5 mr-2" />
                        选择图片
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {/* 图片裁剪区域 */}
                {showCropper && imageSrc && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <h4 className="text-gray-900 dark:text-white font-medium mb-2 flex items-center justify-center">
                        <Crop className="w-5 h-5 mr-2 text-emerald-400" />
                        调整头像区域
                      </h4>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">拖拽调整裁剪区域，建议使用正方形比例</p>
                    </div>
                    
                    {/* 添加一个固定的裁剪区域 */}
                    <div className="flex justify-center mb-4">
                      <div className="w-24 h-24 border-2 border-dashed border-emerald-400/50 rounded-lg overflow-hidden">
                        <div className="w-full h-full bg-emerald-400/20 flex items-center justify-center">
                          <span className="text-xs text-emerald-400">预览区域</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-900/50 dark:bg-black/50 rounded-lg p-4">
                      <div className="flex justify-center">
                        <AvatarCropper
                          imageSrc={imageSrc}
                          onReady={(img) => setImgRef(img)}
                          onComplete={async (img, c) => {
                            setCompletedCrop(c);
                            try {
                              const croppedUrl = await getCroppedImg(img, c);
                              setCroppedImageUrl(croppedUrl);
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-center space-x-3">
                      <button
                        onClick={() => setShowCropper(false)}
                        className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        重新选择
                      </button>
                      <button
                        onClick={handleCropComplete}
                        className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        确认裁剪
                      </button>
                    </div>
                  </div>
                )}

                {/* 裁剪完成后的确认区域 */}
                {croppedImageUrl && !showCropper && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <h4 className="text-gray-900 dark:text-white font-medium mb-2">头像预览</h4>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">确认使用这张图片作为头像吗？</p>
                    </div>
                    
                    <div className="flex justify-center space-x-3">
                      <button
                        onClick={() => {
                          setCroppedImageUrl('');
                          setShowCropper(true);
                        }}
                        className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        重新裁剪
                      </button>
                    </div>
                  </div>
                )}
                </div>
                
              </div>
              
              {/* 底部操作按钮 */}
              <div className="flex space-x-3 p-6 border-t border-gray-200 dark:border-white/20">
                <button
                  onClick={handleAvatarCancel}
                  disabled={isUploading}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-white/30 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors disabled:opacity-50 font-medium hover:border-emerald-400/50"
                >
                  取消
                </button>
                <button
                  onClick={handleAvatarSave}
                  disabled={isUploading || !croppedImageUrl}
                  className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 font-medium flex items-center justify-center shadow-lg hover:shadow-xl"
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                      保存中...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      保存头像
                    </>
                  )}
                </button>
              </div>
            </div>
        </BrowserCompatibleModal>

        {/* Admin Panel Access - Only for Admins */}
        {user.isAdmin && (
          <div className="mt-8 bg-red-500/20 backdrop-blur-sm rounded-lg border border-red-400/30 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-red-600/20 rounded-full flex items-center justify-center border border-red-500/30">
                  <Shield className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">管理员权限</h3>
                  <p className="text-red-300 text-sm">您拥有网站后台管理权限</p>
                </div>
              </div>
              
              <Link
                to="/admin"
                className="inline-flex items-center bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <Settings className="w-5 h-5 mr-2" />
                进入后台管理
              </Link>
            </div>
            
            <div className="mt-4 grid md:grid-cols-3 gap-4">
              <div className="bg-red-600/20 rounded-lg p-3 border border-red-500/30">
                <h4 className="font-medium text-white text-sm mb-1">用户管理</h4>
                <p className="text-red-200 text-xs">查看和管理所有注册用户</p>
              </div>
              <div className="bg-red-600/20 rounded-lg p-3 border border-red-500/30">
                <h4 className="font-medium text-white text-sm mb-1">机器人账号</h4>
                <p className="text-red-200 text-xs">管理和监控机器人账号</p>
              </div>
              <div className="bg-red-600/20 rounded-lg p-3 border border-red-500/30">
                <h4 className="font-medium text-white text-sm mb-1">批量创建</h4>
                <p className="text-red-200 text-xs">批量创建小号进行运营</p>
              </div>
            </div>
          </div>
        )}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Points & Level Progress */}
          <div className="bg-surface-variant/50 backdrop-blur-sm rounded-lg border border-border-surface p-6">
            <h2 className="text-xl font-semibold text-on-surface mb-4 flex items-center">
              <Trophy className="w-5 h-5 text-emerald-400 mr-2" />
              积分与等级
            </h2>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-on-surface-variant">当前积分</span>
                  <span className="text-lg font-bold text-emerald-400">{user.points}</span>
                </div>
                
                {pointsToNext > 0 ? (
                  <>
                    <div className="w-full bg-surface-tertiary rounded-full h-2 mb-2">
                      <div
                        className="bg-emerald-400 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-on-surface-variant">
                      距离 <span className="font-semibold" style={{ color: USER_LEVELS[nextLevelIndex]?.color }}>{USER_LEVELS[nextLevelIndex]?.name}</span> 还需 <span className="font-semibold text-emerald-400">{pointsToNext}</span> 积分
                    </p>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <div className="text-lg font-bold text-yellow-400 mb-2">🎉 恭喜达到最高等级！</div>
                    <div className="text-sm text-on-surface-variant">您已是 <span className="font-semibold" style={{ color: user.level?.color }}>{user.level?.name}</span></div>
                  </div>
                )}
              </div>
              
              <div className="pt-4 border-t border-border-surface">
                <h3 className="text-sm font-medium text-on-surface mb-2">积分获取方式</h3>
                <div className="space-y-1 text-sm text-on-surface-variant">
                  <div className="flex justify-between">
                    <span>每日签到</span>
                    <span className="text-emerald-400">+{POINTS_SYSTEM.DAILY_CHECKIN} 积分</span>
                  </div>
                  <div className="flex justify-between">
                    <span>发布帖子</span>
                    <span className="text-emerald-400">+{POINTS_SYSTEM.CREATE_POST} 积分</span>
                  </div>
                  <div className="flex justify-between">
                    <span>回复帖子</span>
                    <span className="text-emerald-400">+{POINTS_SYSTEM.REPLY_POST} 积分</span>
                  </div>
                  <div className="flex justify-between">
                    <span>点赞帖子</span>
                    <span className="text-emerald-400">+{POINTS_SYSTEM.LIKE_POST} 积分</span>
                  </div>
                  <div className="flex justify-between">
                    <span>首次修改头像</span>
                    <span className="text-emerald-400">+{POINTS_SYSTEM.UPLOAD_AVATAR} 积分</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Stats */}
          <div className="bg-surface-variant/50 backdrop-blur-sm rounded-lg border border-border-surface p-6">
            <h2 className="text-xl font-semibold text-on-surface mb-4 flex items-center">
              <MessageSquare className="w-5 h-5 text-emerald-400 mr-2" />
              活动统计
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-surface-tertiary/30 rounded-lg border border-border-surface">
                <div className="text-2xl font-bold text-emerald-400 mb-1">
                  {isBackendAvailable ? userStats.totalPosts : 
                    forumPosts.filter(post => post.author?.id === user.id || post.author?.username === user.username).length}
                </div>
                <div className="text-sm text-on-surface-variant">发帖数量</div>
              </div>
              <div className="text-center p-4 bg-surface-tertiary/30 rounded-lg border border-border-surface">
                <div className="text-2xl font-bold text-emerald-400 mb-1">
                  {isBackendAvailable ? userStats.totalReplies : 
                    forumPosts.reduce((total, post) => {
                      return total + (post.replies?.filter((reply: any) => 
                        reply.author?.id === user.id || reply.author?.username === user.username
                      ).length || 0);
                    }, 0)}
                </div>
                <div className="text-sm text-on-surface-variant">回复数量</div>
              </div>
              <div className="text-center p-4 bg-surface-tertiary/30 rounded-lg border border-border-surface col-span-2">
                <div className="text-2xl font-bold text-emerald-400 mb-1">
                  {isBackendAvailable ? userStats.consecutiveCheckins : (user.consecutiveCheckins || 0)}
                </div>
                <div className="text-sm text-on-surface-variant">连续签到</div>
              </div>
            </div>
          </div>
        </div>

        {/* Premium Membership Placeholder */}
        <div className="mt-8 bg-surface-variant/50 backdrop-blur-sm rounded-lg border border-border-surface p-8">
          <div className="text-center">
            <Star className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-on-surface mb-2">高级会员</h2>
            <p className="text-on-surface-variant mb-6">
              升级高级会员，享受更多专属权益和功能
            </p>
            
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <div className="p-4 bg-yellow-500/20 rounded-lg border border-yellow-400/30">
                <h3 className="font-semibold text-white mb-2">专属标识</h3>
                <p className="text-sm text-yellow-200">获得特殊的高级会员标识</p>
              </div>
              <div className="p-4 bg-yellow-500/20 rounded-lg border border-yellow-400/30">
                <h3 className="font-semibold text-white mb-2">优先展示</h3>
                <p className="text-sm text-yellow-200">帖子获得更高的展示优先级</p>
              </div>
              <div className="p-4 bg-yellow-500/20 rounded-lg border border-yellow-400/30">
                <h3 className="font-semibold text-white mb-2">专属版块</h3>
                <p className="text-sm text-yellow-200">进入高级会员专属讨论版块</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user.isAdmin && (
                <Link
                  to="/admin"
                  className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center"
                >
                  <Shield className="w-5 h-5 mr-2" />
                  管理后台
                </Link>
              )}
              <button
                disabled
                className="bg-surface-tertiary/30 text-on-surface-tertiary px-8 py-3 rounded-lg font-semibold cursor-not-allowed border border-border-surface"
              >
                升级高级会员 (即将推出)
              </button>
              <button
                disabled
                className="border border-border-surface text-on-surface-tertiary px-8 py-3 rounded-lg font-semibold cursor-not-allowed"
              >
                <CreditCard className="w-5 h-5 mr-2 inline" />
                购买积分 (即将推出)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;