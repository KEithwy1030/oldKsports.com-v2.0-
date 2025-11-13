// auto-migrate.js - 自动数据库迁移脚本（2.0版本）
// 用于兼容旧数据库（添加字段）和新数据库（创建表）
import { getDb } from './db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function autoMigrate() {
    console.log('🔧 开始执行自动数据库迁移...');
    
    try {
        const db = getDb();
        
        // 检查数据库连接
        await new Promise((resolve, reject) => {
            db.query('SELECT 1', (err, result) => {
                if (err) {
                    console.error('数据库连接失败:', err);
                    reject(err);
                } else {
                    console.log('✅ 数据库连接成功');
                    resolve();
                }
            });
        });

        // 检查表是否存在
        const tablesExist = await checkTablesExist(db);
        
        if (tablesExist) {
            console.log('⚠️  检测到数据库中有表，但可能不完整');
            console.log('📦 执行完整迁移（创建缺失的表）...');
            // 执行完整迁移，创建缺失的表（SQL 使用 IF NOT EXISTS，不会重复创建）
            await fullMigration(db);
            console.log('🔧 执行兼容性迁移（添加缺失字段）...');
            // 然后执行兼容性迁移，添加缺失的字段
            await compatibilityMigration(db);
        } else {
            console.log('📦 数据库为空，执行完整初始化...');
            await fullMigration(db);
            await compatibilityMigration(db);
        }

        console.log('✅ 数据库迁移完成');
    } catch (error) {
        console.error('❌ 迁移过程中出错:', error);
        console.warn('⚠️  警告：数据库迁移失败，但服务器将继续启动');
    }
}

// 检查表是否存在
async function checkTablesExist(db) {
    return new Promise((resolve, reject) => {
        db.query(`
            SELECT COUNT(*) as count 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = DATABASE()
        `, (err, results) => {
            if (err) {
                console.error('检查表失败:', err);
                reject(err);
                return;
            }
            resolve(results[0]?.count > 0);
        });
    });
}

// 兼容性迁移：只在现有表中添加字段
async function compatibilityMigration(db) {
    // 兼容：blacklist 表缺失字段自动补齐
    const ensureColumn = async (table, column, ddl) => {
        await new Promise((resolve) => {
            db.query(`
                SELECT COUNT(*) as count
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = ?
                  AND COLUMN_NAME = ?
            `, [table, column], (err, results) => {
                if (err) { console.warn(`[auto-migrate] 检查列失败 ${table}.${column}:`, err.message); return resolve(); }
                const exists = results?.[0]?.count > 0;
                if (exists) return resolve();
                db.query(`ALTER TABLE ${table} ${ddl}`, (alterErr) => {
                    if (alterErr) console.warn(`[auto-migrate] 添加列失败 ${table}.${column}:`, alterErr.message);
                    else console.log(`[auto-migrate] 已添加 ${table}.${column}`);
                    resolve();
                });
            });
        });
    };

    // 检查并添加 last_login 字段
    await new Promise((resolve, reject) => {
        db.query(`
            SELECT COUNT(*) as count 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'users' 
            AND COLUMN_NAME = 'last_login'
        `, (err, results) => {
            if (err) {
                console.error('检查 last_login 字段失败:', err);
                reject(err);
                return;
            }

            const columnExists = results[0]?.count > 0;

            if (columnExists) {
                console.log('✅ last_login 字段已存在');
                resolve();
            } else {
                console.log('🔧 添加 last_login 字段...');
                db.query(`
                    ALTER TABLE users 
                    ADD COLUMN last_login DATETIME NULL DEFAULT NULL 
                    AFTER updated_at
                `, (alterErr) => {
                    if (alterErr) {
                        console.error('添加 last_login 字段失败:', alterErr);
                        resolve(); // 继续执行
                    } else {
                        console.log('✅ last_login 字段添加成功');
                        resolve();
                    }
                });
            }
        });
    });

    // 检查并添加 register_ip 字段
    await ensureColumn('users', 'register_ip', 'ADD COLUMN register_ip VARCHAR(45) NULL DEFAULT NULL AFTER last_login');
    
    // 检查并添加 last_login_ip 字段
    await ensureColumn('users', 'last_login_ip', 'ADD COLUMN last_login_ip VARCHAR(45) NULL DEFAULT NULL AFTER register_ip');

    await ensureColumn('blacklist', 'report_source', "ADD COLUMN report_source ENUM('user','platform') DEFAULT 'user' AFTER evidence_urls");
    await ensureColumn('blacklist', 'updated_at', 'ADD COLUMN updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP AFTER created_at');
    
    // 兼容：merchants 表缺失字段自动补齐
    await ensureColumn('merchants', 'created_by', 'ADD COLUMN created_by INT NOT NULL AFTER contact_info');
    await ensureColumn('merchants', 'updated_at', 'ADD COLUMN updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at');
    
    // 兼容：onboarding_tasks 表缺失字段自动补齐
    await ensureColumn('onboarding_tasks', 'id', 'ADD COLUMN id INT AUTO_INCREMENT FIRST');
    await ensureColumn('onboarding_tasks', 'reward', 'ADD COLUMN reward INT DEFAULT 0 AFTER task_id');
    await ensureColumn('onboarding_tasks', 'completed_at', 'ADD COLUMN completed_at DATETIME DEFAULT CURRENT_TIMESTAMP AFTER reward');
    await ensureColumn('onboarding_tasks', 'created_at', 'ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP AFTER completed_at');
    await ensureColumn('onboarding_tasks', 'last_shown_at', 'ADD COLUMN last_shown_at DATETIME DEFAULT NULL AFTER created_at');
    await ensureColumn('onboarding_tasks', 'dismissed_forever', 'ADD COLUMN dismissed_forever TINYINT(1) DEFAULT 0 AFTER last_shown_at');
    await ensureColumn('onboarding_tasks', 'progress', 'ADD COLUMN progress INT DEFAULT 0 AFTER dismissed_forever');
    await ensureColumn('onboarding_tasks', 'target', 'ADD COLUMN target INT DEFAULT 1 AFTER progress');
}

// 完整迁移：创建所有表
async function fullMigration(db) {
    const sqlPath = path.join(__dirname, '..', 'database_init_schema.sql');
    
    if (!fs.existsSync(sqlPath)) {
        console.warn('⚠️  database_init_schema.sql 不存在，跳过完整迁移');
        return;
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    const statements = sqlContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => {
            // 过滤掉空语句和纯注释语句
            if (!stmt || stmt.length === 0) return false;
            // 移除注释行，检查是否还有实际内容
            const withoutComments = stmt
                .split('\n')
                .filter(line => !line.trim().startsWith('--'))
                .join('\n')
                .trim();
            return withoutComments.length > 0;
        });
    
    for (const statement of statements) {
        // 先清理注释行
        const cleanStatement = statement
            .split('\n')
            .filter(line => !line.trim().startsWith('--'))
            .join('\n')
            .trim();
        
        // 检查清理后的语句是否是 CREATE TABLE
        if (cleanStatement.toUpperCase().startsWith('CREATE TABLE')) {
            // 从清理后的语句中提取表名
            const tableName = cleanStatement.match(/IF NOT EXISTS `?(\w+)`?/)?.[1] || 
                             cleanStatement.match(/TABLE `?(\w+)`?/)?.[1];
            
            try {
                await new Promise((resolve, reject) => {
                    db.query(cleanStatement, (err, result) => {
                        if (err) {
                            if (err.code === 'ER_TABLE_EXISTS_ERROR') {
                                console.log(`⏭️  ${tableName} 表已存在，跳过`);
                                resolve();
                            } else {
                                console.error(`❌ 创建表 ${tableName} 失败:`, err.message);
                                reject(err);
                            }
                        } else {
                            console.log(`✅ ${tableName} 表创建成功`);
                            resolve(result);
                        }
                    });
                });
            } catch (err) {
                console.warn(`⚠️  表 ${tableName} 创建失败，继续执行其他表`);
            }
        }
    }
}

