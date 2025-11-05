// server/controllers/user.controller.js
import jwt from 'jsonwebtoken';
import { updateUserPoints as updateUserPointsService } from '../services/user.service.js';
import { getDb } from '../db.js';

/**
 * 规范化 roles 字段，统一处理各种数据格式
 * @param {any} roles - 可能是数组、JSON字符串、null 或 undefined
 * @returns {string[]} 始终返回数组格式
 */
function normalizeRoles(roles) {
    // 如果为空，返回空数组
    if (!roles) return [];
    
    // 如果已经是数组，直接返回
    if (Array.isArray(roles)) {
        return roles.filter(role => role && typeof role === 'string');
    }
    
    // 如果是字符串，尝试解析
    if (typeof roles === 'string') {
        try {
            // 尝试解析 JSON 字符串
            const parsed = JSON.parse(roles);
            // 如果解析后是数组，返回数组；否则包装成数组
            if (Array.isArray(parsed)) {
                return parsed.filter(role => role && typeof role === 'string');
            }
            return [parsed].filter(role => role && typeof role === 'string');
        } catch (e) {
            // JSON 解析失败，尝试逗号分隔的字符串
            if (roles.includes(',')) {
                return roles.split(',').map(r => r.trim()).filter(r => r);
            }
            // 单个字符串值
            const trimmed = roles.trim();
            return trimmed ? [trimmed] : [];
        }
    }
    
    // 其他类型，返回空数组
    return [];
}

const getUserInfoFromToken = (req) => {
    let token = req.cookies.access_token;
    if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }
    }
    if (!token) return null;
    try {
        return jwt.verify(token, process.env.JWT_SECRET || "oldksports_jwt_secret_key_2024");
    } catch (err) {
        return null;
    }
};

export const updateUserPoints = async (req, res) => {
    try {
        const { points } = req.body;
        if (typeof points !== 'number') {
            return res.status(400).json({ error: "Points must be a number" });
        }

        const result = await updateUserPointsService(req.user.id, points);
        return res.status(200).json({ 
            success: true, 
            message: "Points updated successfully",
            points: points 
        });
    } catch (err) {
        console.error('Update points error:', err);
        return res.status(500).json({ error: "Failed to update points" });
    }
};

export const getUserAvatar = async (req, res) => {
    try {
        const { username } = req.params;
        
        const rows = await new Promise((resolve, reject) => {
            getDb().query(
                'SELECT avatar FROM users WHERE username = ?',
                [username],
                (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                }
            );
        });

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const user = rows[0];
        res.json({ 
            success: true, 
            avatar: user.avatar 
        });
    } catch (error) {
        console.error('Error getting user avatar:', error);
        res.status(500).json({ success: false, error: 'Failed to get avatar' });
    }
};

export const updateUserProfile = async (req, res) => {
    try {
        console.log('更新用户资料请求:', {
            userId: req.user?.id,
            body: req.body,
            headers: req.headers
        });
        
        const userId = req.user.id;
        const updateData = req.body;
        
        console.log('🔧 用户资料更新详情:', {
            updateData,
            allowedFields: ['avatar', 'email', 'username', 'hasUploadedAvatar', 'roles']
        });
        
        // 测试数据库连接
        console.log('🔍 测试数据库连接...');
        const db = getDb();
        if (!db) {
            throw new Error('数据库连接池未初始化');
        }
        
        // 构建动态更新SQL（只更新确实存在的字段）
        const allowedFields = ['avatar', 'email', 'username', 'hasUploadedAvatar', 'roles'];
        const fieldsToUpdate = [];
        const values = [];
        
        for (const [key, value] of Object.entries(updateData)) {
            console.log(`🔧 处理字段: ${key} = ${JSON.stringify(value)}`);
            if (allowedFields.includes(key) && value !== undefined) {
                // 处理字段名映射
                if (key === 'hasUploadedAvatar') {
                    fieldsToUpdate.push('has_uploaded_avatar = ?');
                    values.push(value ? 1 : 0);
                    console.log(`✅ 添加字段: has_uploaded_avatar = ${value ? 1 : 0}`);
                } else if (key === 'roles') {
                    // 处理roles字段，存储为JSON字符串
                    fieldsToUpdate.push('roles = ?');
                    const rolesJson = JSON.stringify(value);
                    values.push(rolesJson);
                    console.log(`✅ 添加字段: roles = ${rolesJson}`);
                } else {
                    fieldsToUpdate.push(`${key} = ?`);
                    values.push(value);
                    console.log(`✅ 添加字段: ${key} = ${value}`);
                }
            } else {
                console.log(`❌ 跳过字段: ${key} (不在允许列表中或值为undefined)`);
            }
        }
        
        // 如果更新头像，自动设置has_uploaded_avatar为true
        if (updateData.avatar && !fieldsToUpdate.includes('has_uploaded_avatar = ?')) {
            fieldsToUpdate.push('has_uploaded_avatar = ?');
            values.push(1);
        }
        
        console.log('🔧 最终更新字段:', {
            fieldsToUpdate,
            values,
            updateData
        });
        
        if (fieldsToUpdate.length === 0) {
            console.log('❌ 没有有效字段需要更新:', updateData);
            return res.status(400).json({ success: false, error: 'No valid fields to update' });
        }
        
        values.push(userId);
        const sql = `UPDATE users SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;
        
        console.log('执行SQL更新:', { sql, values });
        
        await new Promise((resolve, reject) => {
            getDb().query(sql, values, (err, result) => {
                if (err) {
                    console.error('❌ SQL更新失败:', {
                        error: err.message,
                        code: err.code,
                        errno: err.errno,
                        sqlState: err.sqlState,
                        sql: sql,
                        values: values
                    });
                    reject(err);
                } else {
                    console.log('✅ SQL更新成功:', {
                        affectedRows: result.affectedRows,
                        changedRows: result.changedRows,
                        insertId: result.insertId
                    });
                    resolve(result);
                }
            });
        });
        
        // 获取更新后的用户信息（只查询确实存在的字段）
        console.log('🔍 查询更新后的用户信息...');
        const updatedUser = await new Promise((resolve, reject) => {
            getDb().query(
                'SELECT id, username, email, points, avatar, has_uploaded_avatar, roles, created_at, join_date FROM users WHERE id = ?',
                [userId],
                (err, results) => {
                    if (err) {
                        console.error('❌ 查询用户信息失败:', {
                            error: err.message,
                            code: err.code,
                            errno: err.errno,
                            sqlState: err.sqlState,
                            userId: userId
                        });
                        reject(err);
                    } else {
                        console.log('✅ 查询用户信息成功:', {
                            userId: userId,
                            foundUser: !!results[0],
                            userData: results[0] ? {
                                id: results[0].id,
                                username: results[0].username,
                                roles: results[0].roles
                            } : null
                        });
                        resolve(results[0]);
                    }
                }
            );
        });
        
        // 解析roles字段
        let parsedRoles = [];
        try {
            parsedRoles = updatedUser.roles ? JSON.parse(updatedUser.roles) : [];
        } catch (error) {
            console.warn('解析roles字段失败:', error);
            parsedRoles = [];
        }
        
        // 优先使用 join_date（真实注册时间），如果没有则使用 created_at
        const joinDate = updatedUser.join_date || updatedUser.created_at;

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: updatedUser.id,
                username: updatedUser.username,
                email: updatedUser.email,
                points: updatedUser.points,
                avatar: updatedUser.avatar,
                hasUploadedAvatar: updatedUser.has_uploaded_avatar,
                roles: parsedRoles,
                joinDate: joinDate
            }
        });
    } catch (error) {
        console.error('Error updating user profile:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            errno: error.errno,
            sqlState: error.sqlState
        });
        res.status(500).json({ 
            success: false, 
            error: 'Failed to update profile',
            details: error.message 
        });
    }
};

export const getUserInfo = async (req, res) => {
    try {
        const { username } = req.params;
        const rows = await new Promise((resolve, reject) => {
            getDb().query(
                'SELECT id, username, email, points, avatar, has_uploaded_avatar, role, roles, created_at, join_date FROM users WHERE username = ?',
                [username],
                (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                }
            );
        });
        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        const user = rows[0];
        
        // 计算用户等级
        const { getUserLevel } = await import('../utils/userLevel.js');
        const level = getUserLevel(user.points);
        
        // 使用公共函数规范化 roles 字段
        const roles = normalizeRoles(user.roles);

        // 优先使用 join_date（真实注册时间），如果没有则使用 created_at
        const joinDate = user.join_date || user.created_at;

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                points: user.points,
                avatar: user.avatar,
                hasUploadedAvatar: user.has_uploaded_avatar,
                role: user.role || '用户',
                roles: roles, // 统一返回数组格式
                level: level,
                joinDate: joinDate
            }
        });
    } catch (error) {
        console.error('Error getting user info:', error);
        res.status(500).json({ success: false, error: 'Failed to get user info' });
    }
};

// 获取今日在线用户列表
export const getTodayOnlineUsers = async (req, res) => {
    try {
        // 获取最近24小时内登录的用户（视为在线）
        const query = `
            SELECT 
                id,
                username,
                avatar,
                points,
                role,
                roles,
                last_login
            FROM users 
            WHERE last_login IS NOT NULL 
            AND TIMESTAMPDIFF(HOUR, last_login, NOW()) <= 24
            ORDER BY last_login DESC
            LIMIT 20
        `;
        
        const rows = await new Promise((resolve, reject) => {
            getDb().query(query, [], (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });
        
        // 规范化每个用户的 roles 字段（与 getUserInfo 保持一致）
        const normalizedUsers = (rows || []).map(user => ({
            id: user.id,
            username: user.username,
            avatar: user.avatar || null,
            points: user.points || 0,
            role: user.role || '用户',
            roles: normalizeRoles(user.roles), // 使用公共函数统一处理
            last_login: user.last_login
        }));
        
        // 计算总数
        const countQuery = `
            SELECT COUNT(*) AS total 
            FROM users 
            WHERE last_login IS NOT NULL 
            AND TIMESTAMPDIFF(HOUR, last_login, NOW()) <= 24
        `;
        
        const countRows = await new Promise((resolve, reject) => {
            getDb().query(countQuery, [], (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });
        
        const totalOnline = countRows[0]?.total || 0;
        
        res.json({
            success: true,
            data: {
                users: normalizedUsers, // 返回规范化后的数据
                totalOnline: totalOnline
            }
        });
    } catch (error) {
        console.error('Error getting today online users:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            sqlState: error.sqlState,
            sql: error.sql
        });
        res.status(500).json({ 
            success: false, 
            error: 'Failed to get online users',
            details: error.message,
            data: {
                users: [],
                totalOnline: 0
            }
        });
    }
};