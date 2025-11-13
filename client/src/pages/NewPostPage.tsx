import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Send, ArrowLeft } from 'lucide-react';
import { FORUM_CATEGORIES } from '../data/constants';
import { useAuth } from '../context/AuthContext';
import RichTextEditor from '../components/RichTextEditor';
import MultiImageUpload from '../components/MultiImageUpload';
import { POINTS_SYSTEM, USER_LEVELS } from '../data/constants';
import PageTransition from '../components/PageTransition';
import Toast from '../components/Toast';
import { buildApiUrl } from '../config/api.config';

const NewPostPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/forum';
  const defaultCategory = location.state?.category || 'general';
  const { user, refreshUserData, addForumPost } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: defaultCategory,
  });
  const TITLE_MAX = 15;
  const CONTENT_MAX = 200;
  const titleLength = formData.title.length;
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [toast, setToast] = useState<{visible: boolean; message: string; type: 'success' | 'error' | 'info' | 'points' | 'levelup'}>({ visible: false, message: '', type: 'info' });

  // 监听升级事件
  useEffect(() => {
    const handleLevelUp = (event: CustomEvent) => {
      const { oldLevel, newLevel, newPoints } = event.detail;
      setToast({
        visible: true,
        message: `🎉 恭喜！您升级了！\n从 ${oldLevel.name} 升级到 ${newLevel.name}\n当前积分：${newPoints}`,
        type: 'levelup'
      });
    };
    
    window.addEventListener('userLevelUp', handleLevelUp as EventListener);
    return () => {
      window.removeEventListener('userLevelUp', handleLevelUp as EventListener);
    };
  }, []);

  // 将 dataURL 转为 File
  const dataUrlToFile = async (dataUrl: string, index: number): Promise<File> => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const ext = (blob.type.split('/')[1] || 'png').split(';')[0];
    return new File([blob], `post_image_${Date.now()}_${index}.${ext}`, { type: blob.type });
  };

  const uploadImagesIfNeeded = async (imgs: string[]): Promise<string[]> => {
    const dataUrls = imgs.filter(src => src.startsWith('data:'));
    if (dataUrls.length === 0) return imgs;
    const form = new FormData();
    const files = await Promise.all(dataUrls.map((d, i) => dataUrlToFile(d, i)));
    files.forEach(f => form.append('images', f));
    try {
      const resp = await fetch(buildApiUrl('/upload/images'), { method: 'POST', body: form });
      const result = await resp.json();
      if (result?.success && Array.isArray(result.files)) {
        const serverPaths: string[] = result.files.map((f: any) => f.path);
        let idx = 0;
        return imgs.map(src => src.startsWith('data:') ? (serverPaths[idx++] || src) : src);
      }
    } catch (e) {
      console.warn('图片批量上传失败，降级为内联dataURL保存：', e);
    }
    return imgs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // 规则：标题必须<=15字
    if (formData.title.length === 0) {
      setTitleError('标题不能为空');
      return;
    }
    if (formData.title.length > TITLE_MAX) {
      setTitleError(`标题过长（${formData.title.length}/${TITLE_MAX}），请缩短后再发布`);
      return;
    }
    // 规则：正文必须<=200字（仅统计纯文本）
    const plainText = (formData.content || '').replace(/<[^>]*>/g, '').trim();
    if (plainText.length === 0) {
      alert('❌ 帖子内容不能为空');
      return;
    }
    if (plainText.length > CONTENT_MAX) {
      alert('❌ 帖子内容不能超过200个字符');
      return;
    }
    setTitleError(null);
    setIsSubmitting(true);

    try {
      // 若为 dataURL，先上传换成 /uploads/images/...，防止后续构建变更导致失效
      const normalizedImages = await uploadImagesIfNeeded(images);
      let contentWithImages = formData.content;
      if (normalizedImages.length > 0) {
        const imageHtml = normalizedImages.map((image, index) => 
          `<img src="${image}" alt="帖子图片 ${index + 1}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0; display: block;" class="post-image" />`
        ).join('');
        contentWithImages = contentWithImages + '\n\n' + imageHtml;
      }

      // 创建帖子对象
      const newPostObj = {
        title: formData.title,
        content: contentWithImages,
        category: formData.category,
      };

      // 使用后端API创建帖子（后端会自动增加积分）
      const response = await addForumPost(newPostObj);
      
      // 刷新用户信息以获取最新积分
      if (refreshUserData) {
        await refreshUserData();
      }
      
      // 显示积分奖励提醒（使用 Toast）
      if (user && response?.pointsAwarded) {
        const oldLevel = user.level;
        const newTotalPoints = (user.points || 0) + response.pointsAwarded;
        const newLevel = USER_LEVELS.slice().reverse().find(level => newTotalPoints >= level.minPoints);
        
        if (newLevel && newLevel.id !== oldLevel?.id) {
          setToast({ 
            visible: true, 
            message: `🎉 恭喜！帖子发布成功！\n您从 ${oldLevel?.name || '未知'} 升级到 ${newLevel.name}！\n获得 ${response.pointsAwarded} 积分奖励`, 
            type: 'levelup' 
          });
        } else {
          setToast({ 
            visible: true, 
            message: `✅ 帖子发布成功！\n获得 ${response.pointsAwarded} 积分奖励`, 
            type: 'success' 
          });
        }
      } else if (user) {
        // 如果后端没有返回积分信息，使用默认值
        const oldLevel = user.level;
        const newTotalPoints = (user.points || 0) + POINTS_SYSTEM.CREATE_POST;
        const newLevel = USER_LEVELS.slice().reverse().find(level => newTotalPoints >= level.minPoints);
        
        if (newLevel && newLevel.id !== oldLevel?.id) {
          setToast({ 
            visible: true, 
            message: `🎉 恭喜！帖子发布成功！\n您从 ${oldLevel?.name || '未知'} 升级到 ${newLevel.name}！\n获得 ${POINTS_SYSTEM.CREATE_POST} 积分奖励`, 
            type: 'levelup' 
          });
        } else {
          setToast({ 
            visible: true, 
            message: `✅ 帖子发布成功！\n获得 ${POINTS_SYSTEM.CREATE_POST} 积分奖励`, 
            type: 'success' 
          });
        }
      } else {
        setToast({ 
          visible: true, 
          message: '✅ 帖子发布成功！', 
          type: 'success' 
        });
      }
      
    } catch (error: any) {
      console.error('Failed to create post:', error);
      let errorMessage = '帖子发布失败，请重试';
      
      // 检查错误消息
      if (error?.message && error.message.includes('标题长度不能超过15个字符')) {
        errorMessage = '标题长度不能超过15个字符';
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      alert(`❌ ${errorMessage}`);
    }
    
    setIsSubmitting(false);
    
    // 确保跳转到正确的页面
    if (from.includes('/forum/')) {
      navigate(from);
    } else {
      navigate('/forum');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  // 避免在渲染期间调用导航导致的重复渲染
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) return null;

  return (
    <>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ visible: false, message: '', type: 'info' })}
      />
    <PageTransition>
      <div className="min-h-screen bg-gradient-radial from-slate-700 to-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(from)}
                className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
              >
                <ArrowLeft size={20} />
                <span>返回</span>
              </button>
              <div>
                <h1 className="text-3xl font-bold text-white">发布新帖</h1>
                <p className="text-gray-300 mt-2">分享您的观点，参与社区讨论</p>
              </div>
            </div>
            
            <div className="text-sm text-gray-400">
              当前用户：{user.username}
            </div>
          </div>

          {/* Post Form */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-white mb-2">
                    帖子标题 *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    required
                    value={formData.title}
                    onChange={(e) => {
                      const v = e.target.value || '';
                      setFormData(prev => ({ ...prev, title: v.slice(0, TITLE_MAX) }));
                    }}
                    className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-white placeholder-gray-400"
                    placeholder="帖子标题 - 不超过15字符"
                  />
                  <div className={`mt-1 text-xs ${titleLength > TITLE_MAX ? 'text-red-400' : 'text-gray-400'}`}>{titleLength}/{TITLE_MAX}</div>
                  {titleError && (
                    <div className="mt-1 text-xs text-red-400">{titleError}</div>
                  )}
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-white mb-2">
                    选择版块 *
                  </label>
                  <select
                    id="category"
                    name="category"
                    required
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-white"
                  >
                    {FORUM_CATEGORIES.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="content" className="block text-sm font-medium text-white mb-2">
                  帖子内容 *
                </label>
                <RichTextEditor
                  value={formData.content}
                  onChange={(content) => setFormData(prev => ({ ...prev, content }))}
                  placeholder="帖子内容 - 不超过200字符"
                  rows={12}
                />
              </div>

              {/* Image Upload Section - 非常明显的测试版本 */}
              <div className="bg-red-500/20 border-2 border-red-500 rounded-lg p-6 mb-6">
                <div className="text-red-300 text-2xl font-bold mb-4">🚨 图片上传功能测试区域 🚨</div>
                <div className="text-white text-lg mb-4">
                  如果您能看到这个红色区域，说明页面正在更新！
                </div>
                <div className="text-yellow-300 text-sm mb-4">
                  当前已上传 {images.length} 张图片
                </div>
                
                {/* 超明显的上传按钮 */}
                <div className="mb-4">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files) {
                        const newImages: string[] = [];
                        Array.from(files).forEach((file) => {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const result = event.target?.result as string;
                            newImages.push(result);
                            if (newImages.length === files.length) {
                              setImages([...images, ...newImages]);
                            }
                          };
                          reader.readAsDataURL(file);
                        });
                      }
                    }}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="inline-flex items-center px-8 py-4 bg-yellow-500 text-black text-xl font-bold rounded-lg hover:bg-yellow-400 cursor-pointer transition-colors border-2 border-yellow-300"
                  >
                    📷 点击这里上传图片 (最多9张) 📷
                  </label>
                </div>
                
                {/* 图片预览 */}
                {images.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {images.map((image, index) => (
                      <div key={index} className="relative">
                        <img
                          src={image}
                          alt={`上传的图片 ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border-2 border-white"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newImages = images.filter((_, i) => i !== index);
                            setImages(newImages);
                          }}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* 使用提示 */}
                <div className="text-green-300 text-sm space-y-1">
                  <p>✅ 支持 JPG、PNG、GIF 格式</p>
                  <p>✅ 单张图片大小不超过 5MB</p>
                  <p>✅ 最多可上传 9 张图片</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-white/20">
                <div className="text-sm text-gray-300">
                  发帖奖励：<span className="font-semibold text-emerald-400">+{POINTS_SYSTEM.CREATE_POST} 积分</span>
                </div>
                
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => navigate(from)}
                    className="px-6 py-2 border border-white/30 text-gray-300 rounded-md hover:bg-white/10 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !formData.title || !formData.content || formData.title.length > TITLE_MAX}
                    className="inline-flex items-center bg-emerald-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {isSubmitting ? '发布中...' : '发布帖子'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Posting Guidelines */}
          <div className="mt-8 bg-yellow-500/20 border border-yellow-400/30 rounded-lg p-6 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-yellow-300 mb-3">发帖须知</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-yellow-200">
              <div>
                <h4 className="font-medium mb-2 text-white">内容规范</h4>
                <ul className="space-y-1">
                  <li>• 保持友善和专业的交流态度</li>
                  <li>• 确保内容与所选版块相关</li>
                  <li>• 禁止发布广告或垃圾信息</li>
                  <li>• 尊重他人观点，理性讨论</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2 text-white">格式建议</h4>
                <ul className="space-y-1">
                  <li>• 使用清晰的标题和段落</li>
                  <li>• 适当添加图片增强表达</li>
                  <li>• 引用资料请注明来源</li>
                  <li>• 善用话题标签便于检索</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
    </>
  );
};

export default NewPostPage;