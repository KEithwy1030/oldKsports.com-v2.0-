// server/db.js - ZEABUR PRODUCTION VERSION (OPTIMIZED)
import mysql from 'mysql2';
import dotenv from 'dotenv';

dotenv.config();

// 调试：打印环境变量
console.log('=== Database Connection Debug ===');
console.log('MYSQL_HOST:', process.env.MYSQL_HOST);
console.log('MYSQL_USERNAME:', process.env.MYSQL_USERNAME);
console.log('MYSQL_PASSWORD:', process.env.MYSQL_PASSWORD ? '***' : 'undefined');
console.log('MYSQL_DATABASE:', process.env.MYSQL_DATABASE);
console.log('MYSQL_PORT:', process.env.MYSQL_PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);

// 本地开发环境默认配置
const isDevelopment = process.env.NODE_ENV === 'development';

// 验证必需的环境变量，开发环境使用默认值
const defaultConfig = {
  MYSQL_HOST: 'localhost',
  MYSQL_USERNAME: 'root',
  MYSQL_PASSWORD: 'k19941030',
  MYSQL_DATABASE: 'old_k_sports',
  MYSQL_PORT: '3306'
};

// 在开发环境中使用默认配置
if (isDevelopment) {
  Object.keys(defaultConfig).forEach(key => {
    if (!process.env[key]) {
      process.env[key] = defaultConfig[key];
      console.log(`🔧 Using default ${key}: ${key.includes('PASSWORD') ? '***' : defaultConfig[key]}`);
    }
  });
} else {
  // 生产环境严格检查环境变量
  const requiredEnvVars = ['MYSQL_HOST', 'MYSQL_USERNAME', 'MYSQL_PASSWORD', 'MYSQL_DATABASE'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars);
    console.error('Please check your Zeabur environment variable configuration.');
    process.exit(1);
  }
}

// 使用Zeabur提供的数据库配置
const DATABASE_NAME = process.env.MYSQL_DATABASE;
console.log('Using database name:', DATABASE_NAME);

// 优化的数据库连接配置
const connectionConfig = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USERNAME,
  password: process.env.MYSQL_PASSWORD,
  database: DATABASE_NAME,
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  // 连接超时配置（优化：从30秒减少到10秒）
  connectTimeout: 10000,        // 10秒连接超时
  // 连接池配置（优化：从10增加到25）
  connectionLimit: 25,          // 最大连接数（20-30之间）
  queueLimit: 0,                // 无限制队列
  waitForConnections: true,     // 等待可用连接
  // 重试配置
  maxRetries: 5,                // 最大重试次数
  retryDelay: 3000              // 重试延迟（毫秒）
};

console.log('Connection config:', {
  ...connectionConfig,
  password: '***'
});

// 创建连接池
let db = null;
let isDbConnected = false;
let connectionRetryTimer = null;

export const getDb = () => {
  if (!db) {
    console.log('Creating database connection pool...');
    try {
      db = mysql.createPool(connectionConfig);
      
      // 异步测试连接，不阻塞服务启动
      testDbConnectionAsync();
    } catch (error) {
      console.error('❌ Error creating database pool:', error);
      // 不退出进程，允许服务启动，后续会在请求时重试
    }
  }
  return db;
};

// 异步测试数据库连接（不阻塞服务启动）
const testDbConnectionAsync = (retryCount = 0) => {
  if (!db) return;
  
  db.getConnection((error, connection) => {
    if (error) {
      console.error(`❌ Database connection attempt ${retryCount + 1}/${connectionConfig.maxRetries} failed:`, error.message);
      
      if (retryCount < connectionConfig.maxRetries - 1) {
        console.log(`🔄 Retrying connection in ${connectionConfig.retryDelay}ms...`);
        connectionRetryTimer = setTimeout(() => {
          testDbConnectionAsync(retryCount + 1);
        }, connectionConfig.retryDelay);
      } else {
        console.error('⚠️  Database connection failed after all retries');
        console.error('⚠️  Server will continue running, but database operations may fail');
        console.error('⚠️  Connection will be retried automatically on next database query');
        isDbConnected = false;
      }
    } else {
      console.log('✅ Successfully connected to the database');
      console.log('📊 Connection pool created successfully');
      isDbConnected = true;
      connection.release();
    }
  });
};

// 导出连接状态检查函数
export const isDatabaseConnected = () => isDbConnected;

// 为了向后兼容，也导出db
export { getDb as db };