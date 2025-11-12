// server/controllers/auth.controller.js
import { findUserByUsername, findUserByUsernameOrEmail, findUserByEmail, findUserByResetToken, createUser, createPasswordResetToken, resetPassword } from '../services/auth.service.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { NotificationService } from '../services/notification.service.js';
import { addUserLevel } from '../utils/userLevel.js';
import { getDb } from '../db.js';
import { getClientIp } from '../utils/getClientIp.js';

dotenv.config();

export const register = async (req, res) => {
    try {
        console.log('Register request received:', { username: req.body.username, email: req.body.email, roles: req.body.roles });
        const { username, email, password, roles } = req.body;
        
        // Validate required fields
        if (!username || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: "用户名、邮箱和密码都是必填项" 
            });
        }
        
        // Check if username already exists
        const existingUsers = await findUserByUsername(username);
        if (existingUsers.length) {
            return res.status(409).json({ 
                success: false, 
                message: "用户名已被注册" 
            });
        }
        
        // Check if email already exists
        const existingEmails = await findUserByEmail(email);
        if (existingEmails.length) {
            return res.status(409).json({ 
                success: false, 
                message: "邮箱已被注册" 
            });
        }
        
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(password, salt);
        
        // 获取客户端IP地址
        const clientIp = getClientIp(req);
        
        // Create user with email and roles
        await createUser(username, email, hash, roles, clientIp);
        
        // 获取新创建用户的ID
        const newUsers = await findUserByUsername(username);
        if (newUsers.length > 0) {
            const newUserId = newUsers[0].id;
            
            // 注册成功后立即记录 last_login，保证在线用户统计正常
            try {
                const db = getDb();
                await new Promise((resolve, reject) => {
                    db.query(
                        'UPDATE users SET last_login = NOW() WHERE id = ?',
                        [newUserId],
                        (err) => {
                            if (err) {
                                console.error('更新注册用户 last_login 失败:', err);
                                resolve();
                            } else {
                                resolve();
                            }
                        }
                    );
                });
                newUsers[0].last_login = new Date();
            } catch (lastLoginError) {
                console.error('注册流程写入 last_login 异常:', lastLoginError);
            }
            
            // 创建系统欢迎通知
            try {
                console.log('🔔 开始为新用户创建欢迎通知:', { newUserId, username });
                console.log('🔔 通知服务状态检查:', typeof NotificationService);
                console.log('🔔 通知服务方法检查:', typeof NotificationService.createSystemNotification);
                
                const notificationResult = await NotificationService.createSystemNotification(
                    newUserId,
                    '欢迎加入OldkSports体育社区！',
                    `🎉 欢迎 ${username} 加入我们的体育社区！\n\n在这里您可以：\n• 📝 发布体育相关的帖子和讨论\n• 💬 与其他体育爱好者交流互动\n• 🏆 参与论坛活动，积累积分等级\n• 🔍 浏览优质商家和服务信息\n• 💌 通过私信功能与其他用户深入交流\n\n点击右上角用户名可以查看通知，点击其他用户头像可以发起私聊。祝您在社区中玩得愉快！`
                );
                console.log('🔔 新用户欢迎通知创建成功:', notificationResult);
                console.log('🔔 通知创建结果详情:', {
                    success: notificationResult.success,
                    notificationId: notificationResult.notificationId,
                    message: notificationResult.message
                });
            } catch (notifyError) {
                console.error('❌ 创建欢迎通知失败:', notifyError);
                console.error('❌ 通知错误详情:', {
                    message: notifyError.message,
                    stack: notifyError.stack,
                    code: notifyError.code,
                    errno: notifyError.errno,
                    sqlState: notifyError.sqlState
                });
                // 不影响注册流程
            }
        }
        
        // 生成JWT token用于自动登录
        const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-123456789';
        console.log('🔑 JWT密钥状态:', {
            hasSecret: !!process.env.JWT_SECRET,
            secretLength: jwtSecret.length,
            usingFallback: !process.env.JWT_SECRET
        });
        
        const token = jwt.sign(
            { 
                userId: newUsers[0].id,  // 修复字段名，与auth.js中的decoded.userId匹配
                id: newUsers[0].id, 
                username: newUsers[0].username, 
                email: newUsers[0].email,
                isAdmin: newUsers[0].is_admin || false
            },
            jwtSecret,
            { expiresIn: '7d' }
        );
        
        // 处理用户数据，确保所有字段正确
        // 优先使用 join_date（真实注册时间），如果没有则使用 created_at
        const joinDate = newUsers[0].join_date || newUsers[0].created_at;
        
        const userData = {
            id: newUsers[0].id,
            username: newUsers[0].username,
            email: newUsers[0].email,
            points: newUsers[0].points || 0,
            avatar: newUsers[0].avatar,
            hasUploadedAvatar: newUsers[0].has_uploaded_avatar || false,
            isAdmin: newUsers[0].is_admin || false,
            roles: roles || [],
            joinDate: joinDate,
            lastLogin: newUsers[0].last_login || new Date()
        };
        
        console.log('🔔 注册成功，返回用户数据:', userData);
        
        return res.status(201).json({ 
            success: true, 
            message: "用户注册成功",
            token: token,
            user: userData
        });
    } catch (err) {
        console.error('Registration error:', err);
        console.error('Registration error stack:', err.stack);
        return res.status(500).json({ 
            success: false, 
            message: "注册失败，请稍后重试",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

export const login = async (req, res) => {
    try {
        console.log('Login request received:', { username: req.body.username, email: req.body.email });
        const { username, email, password } = req.body;
        
        // 支持用户名或邮箱登录
        const identifier = username || email;
        
        // Validate required fields
        if (!identifier || !password) {
            return res.status(400).json({ 
                success: false, 
                message: "用户名/邮箱和密码都是必填项" 
            });
        }
        
        // Find user by username or email
        const users = await findUserByUsernameOrEmail(identifier);
        if (users.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "用户不存在" 
            });
        }
        
        const user = users[0];
        const isPasswordCorrect = bcrypt.compareSync(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(400).json({ 
                success: false, 
                message: "用户名或密码错误" 
            });
        }
        
        // Generate JWT token with expiration
        const jwtSecret = process.env.JWT_SECRET || "oldksports_jwt_secret_key_2024";
        const token = jwt.sign(
            { 
                userId: user.id,
                id: user.id,
                username: user.username,
                email: user.email,
                isAdmin: user.is_admin || false
            }, 
            jwtSecret,
            { expiresIn: '7d' } // 7天过期
        );
        
        console.log('JWT生成:', { 
            userId: user.id, 
            secretLength: jwtSecret.length,
            tokenLength: token.length 
        });
        
        // 2.0版本：更新last_login和last_login_ip字段
        let updatedLastLogin = null;
        try {
            const db = getDb();
            // 获取客户端IP地址
            const clientIp = getClientIp(req);
            // 更新last_login和last_login_ip并获取更新后的时间
            await new Promise((resolve, reject) => {
                db.query(
                    'UPDATE users SET last_login = NOW(), last_login_ip = ? WHERE id = ?',
                    [clientIp, user.id],
                    (err, results) => {
                        if (err) {
                            console.error('更新last_login失败:', err);
                            // 不阻止登录，只记录错误
                            resolve();
                        } else {
                            console.log('✅ last_login和last_login_ip已更新:', user.id, clientIp);
                            // 获取更新后的last_login
                            db.query(
                                'SELECT last_login FROM users WHERE id = ?',
                                [user.id],
                                (err2, results2) => {
                                    if (!err2 && results2.length > 0) {
                                        updatedLastLogin = results2[0].last_login;
                                    }
                                    resolve();
                                }
                            );
                        }
                    }
                );
            });
        } catch (updateError) {
            console.error('更新last_login异常:', updateError);
            // 不阻止登录流程
        }
        
        // Remove sensitive data and add user level
        const { password: _, ...userData } = user;
        // 使用更新后的last_login（如果更新成功）
        if (updatedLastLogin) {
            userData.last_login = updatedLastLogin;
        }
        const userWithLevel = addUserLevel(userData);
        
        // Set cookie and return user data
        res.cookie("access_token", token, { 
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        }).status(200).json({
            success: true,
            user: userWithLevel,
            token: token
        });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ 
            success: false, 
            message: "登录失败，请稍后重试" 
        });
    }
};

export const logout = (req, res) => {
    res.clearCookie("access_token", { sameSite: "none", secure: true }).status(200).json("User has been logged out.");
};

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            return res.status(400).json({ 
                success: false, 
                message: "请输入有效的邮箱地址" 
            });
        }
        
        // Find user by email
        const users = await findUserByEmail(email);
        if (users.length === 0) {
            // For security reasons, don't reveal that the email doesn't exist
            return res.status(200).json({ 
                success: true, 
                message: "如果该邮箱地址已注册，重置密码链接已发送到您的邮箱" 
            });
        }
        
        // Generate secure reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour from now
        
        // Store reset token in database
        await createPasswordResetToken(email, resetToken, resetTokenExpires);
        
        // In production, you would send an email with the reset link
        // For development, return the reset link
        const resetLink = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;
        
        return res.status(200).json({ 
            success: true,
            message: "重置密码链接已发送到您的邮箱",
            resetLink: process.env.NODE_ENV === 'development' ? resetLink : undefined
        });
    } catch (err) {
        console.error('Forgot password error:', err);
        return res.status(500).json({ 
            success: false, 
            message: "处理请求时发生错误，请稍后重试" 
        });
    }
};

export const resetPasswordToken = async (req, res) => {
    try {
        const { token } = req.params;
        const { password, confirmPassword } = req.body;
        
        // Validate token format
        if (!token || token.length !== 64) {
            return res.status(400).json({ 
                success: false, 
                message: "无效的重置令牌" 
            });
        }
        
        // Validate password
        if (!password || password.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: "密码至少需要6位字符" 
            });
        }
        
        // Validate password confirmation
        if (password !== confirmPassword) {
            return res.status(400).json({ 
                success: false, 
                message: "两次输入的密码不一致" 
            });
        }
        
        // Find user by reset token
        const users = await findUserByResetToken(token);
        if (users.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "重置令牌无效或已过期" 
            });
        }
        
        // Hash new password
        const salt = bcrypt.genSaltSync(10);
        const newPasswordHash = bcrypt.hashSync(password, salt);
        
        // Update password and clear reset token
        await resetPassword(token, newPasswordHash);
        
        return res.status(200).json({ 
            success: true, 
            message: "密码重置成功，请使用新密码登录" 
        });
    } catch (err) {
        console.error('Reset password error:', err);
        return res.status(500).json({ 
            success: false, 
            message: "重置密码失败，请稍后重试" 
        });
    }
};