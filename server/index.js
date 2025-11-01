// server/index.js
import express from "express";
import authRoutes from "./routes/auth.js";
import postRoutes from "./routes/posts.js";
import userRoutes from "./routes/users.js";
import userStatsRoutes from "./routes/userStats.js";
import adminRoutes from "./routes/admin.routes.js";
import notificationRoutes from "./routes/notifications.js";
import messageRoutes from "./routes/messages.js";
import merchantsRoutes from "./routes/merchants.js";
import cookieParser from "cookie-parser";
import { authenticateToken } from "./middleware/auth.js";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import nodePath from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import { getDb } from "./db.js";

const __dirname = nodePath.dirname(fileURLToPath(import.meta.url));

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080; // 生产环境端口（Zeabur 默认 8080）或本地开发端口

// 支持多个CORS源，包括生产环境的前端域名
const corsOrigins = [
  process.env.CORS_ORIGIN,
  process.env.FRONTEND_SERVICE_URL,         // Zeabur 自动注入的前端服务 URL
  "https://oldksports-web.zeabur.app",      // 当前前端域名（兼容）
  "https://oldksports-app.zeabur.app",      // 当前后端域名（兼容）
  "https://oldksports.zeabur.app",          // 旧域名（兼容性）
  "https://oldksports-frontend.zeabur.app", // 旧域名（兼容性）
  "https://oldksports.com",                 // 未来自定义域名
  "http://localhost:5173",                  // 本地开发
  "http://localhost:3000"                   // 本地开发备用端口
].filter(Boolean); // 过滤掉undefined值

console.log('CORS Origins:', corsOrigins);
console.log('CORS Environment Variable:', process.env.CORS_ORIGIN);

app.use(cors({ 
  origin: (origin, callback) => {
    console.log('CORS Request Origin:', origin);
    // 允许直接访问（无Origin头）和明确的域名
    if (!origin) {
      console.log('CORS Allowed: Direct access (no origin header)');
      callback(null, true);
    } else if (corsOrigins.includes(origin)) {
      console.log('CORS Allowed:', origin);
      callback(null, true);
    } else {
      console.log('CORS Blocked:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Forwarded-Proto', 'X-Forwarded-Host'],
  optionsSuccessStatus: 200
}));
app.use(express.json({ limit: '1gb' }));
app.use(express.urlencoded({ limit: '1gb', extended: true }));
app.use(cookieParser());

// 确保上传目录存在
const uploadsDir = nodePath.join(process.cwd(), 'uploads', 'images');
const publicUploadsDir = nodePath.join(process.cwd(), 'public', 'uploads', 'images');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(publicUploadsDir)) {
  fs.mkdirSync(publicUploadsDir, { recursive: true });
}

// 兼容处理：启动时将历史图片统一迁移到 public/uploads/images
const migrateLegacyImages = () => {
  try {
    const legacyDirs = [
      // 旧后端路径
      uploadsDir,
      // 旧前端构建前的静态路径（本地开发可能存在）
      nodePath.join(process.cwd(), '..', 'client', 'public', 'uploads', 'images')
    ];

    legacyDirs.forEach((dir) => {
      try {
        if (!fs.existsSync(dir)) return;
        const files = fs.readdirSync(dir);
        files.forEach((file) => {
          const src = nodePath.join(dir, file);
          const dst = nodePath.join(publicUploadsDir, file);
          try {
            if (fs.statSync(src).isFile()) {
              if (!fs.existsSync(dst)) {
                fs.copyFileSync(src, dst);
                console.log('迁移历史图片:', file);
              }
            }
          } catch (e) {
            console.warn('迁移单个文件失败:', file, e?.message);
          }
        });
      } catch (e) {
        console.warn('扫描历史目录失败:', dir, e?.message);
      }
    });
  } catch (e) {
    console.warn('迁移历史图片流程出现异常:', e?.message);
  }
};
// 启动时执行一次迁移
migrateLegacyImages();

// 配置multer用于文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名：时间戳_随机数_原文件名
    const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1E9);
    const ext = nodePath.extname(file.originalname);
    cb(null, 'post_' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB限制
  },
  fileFilter: function (req, file, cb) {
    // 只允许图片文件
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'), false);
    }
  }
});

// 静态文件服务 - 提供上传的图片访问
app.use('/uploads/images', express.static(nodePath.join(process.cwd(), 'public', 'uploads', 'images')));

// Health check routes（提供两种路径，便于端口探活脚本使用）
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Server is running" });
});
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Server is running" });
});

// 图片上传接口
app.post("/api/upload/images", upload.array('images', 9), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: "没有上传任何文件" 
      });
    }

    const uploadedFiles = req.files.map(file => {
      // 复制文件到public目录，供前端访问
      const publicPath = nodePath.join(publicUploadsDir, file.filename);
      fs.copyFileSync(file.path, publicPath);
      
      return {
        filename: file.filename,
        originalName: file.originalname,
        path: `/uploads/images/${file.filename}`,
        size: file.size,
        mimetype: file.mimetype
      };
    });

    res.json({
      success: true,
      files: uploadedFiles,
      message: `成功上传 ${uploadedFiles.length} 张图片`
    });

  } catch (error) {
    console.error('图片上传错误:', error);
    res.status(500).json({
      success: false,
      error: "图片上传失败"
    });
  }
});

// 静态文件服务 - 为上传的图片提供访问
console.log('静态文件服务路径:', nodePath.join(process.cwd(), 'public', 'uploads', 'images'));
console.log('当前工作目录:', process.cwd());

// 使用相对路径，适配Zeabur部署
const staticPath = nodePath.join(process.cwd(), 'public', 'uploads', 'images');
console.log('使用静态文件路径:', staticPath);

app.use('/uploads/images', express.static(staticPath));
// 兼容旧的URL路径（直接/uploads/文件名）  
app.use('/uploads', express.static(staticPath));

// 一次性迁移任务：把帖子与回复里的 data:image 内联图片落盘并替换为 /uploads/images/ 路径
async function migrateInlineImagesOnce() {
  try {
    const db = getDb();
    // 读取帖子
    const posts = await new Promise((resolve, reject) => {
      db.query('SELECT id, content FROM forum_posts', (err, rows) => err ? reject(err) : resolve(rows));
    });
    // 读取回复
    const replies = await new Promise((resolve, reject) => {
      db.query('SELECT id, content FROM forum_replies', (err, rows) => err ? reject(err) : resolve(rows));
    });

    const ensureDir = (dir) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); };
    const uploadsDir = nodePath.join(process.cwd(), 'public', 'uploads', 'images');
    ensureDir(uploadsDir);

    const saveDataUrl = async (dataUrl) => {
      const match = /^data:(.*?);base64,(.*)$/.exec(dataUrl);
      if (!match) return null;
      const mime = match[1] || 'image/jpeg';
      const base64 = match[2];
      const ext = mime.split('/')[1] || 'jpg';
      const filename = `migr_${Date.now()}_${Math.floor(Math.random()*1e6)}.${ext}`;
      const abs = nodePath.join(uploadsDir, filename);
      const buf = Buffer.from(base64, 'base64');
      fs.writeFileSync(abs, buf);
      return `/uploads/images/${filename}`;
    };

    const replaceInline = async (html) => {
      if (!html || typeof html !== 'string') return html;
      const re = /<img[^>]+src=["'](data:image\/[a-zA-Z0-9+.-]+;base64,[^"']+)["'][^>]*>/g;
      let out = html;
      const tasks = [];
      let m;
      while ((m = re.exec(html)) !== null) {
        const dataUrl = m[1];
        tasks.push((async () => {
          const newPath = await saveDataUrl(dataUrl);
          if (newPath) {
            out = out.replace(dataUrl, newPath);
          }
        })());
      }
      await Promise.all(tasks);
      return out;
    };

    const updatePost = (id, content) => new Promise((resolve, reject) => {
      db.query('UPDATE forum_posts SET content=? WHERE id=?', [content, id], (err) => err ? reject(err) : resolve());
    });
    const updateReply = (id, content) => new Promise((resolve, reject) => {
      db.query('UPDATE forum_replies SET content=? WHERE id=?', [content, id], (err) => err ? reject(err) : resolve());
    });

    // 逐条处理（小批量）
    for (const row of posts) {
      const newHtml = await replaceInline(row.content);
      if (newHtml && newHtml !== row.content) {
        await updatePost(row.id, newHtml);
      }
    }
    for (const row of replies) {
      const newHtml = await replaceInline(row.content);
      if (newHtml && newHtml !== row.content) {
        await updateReply(row.id, newHtml);
      }
    }

    console.log('✅ 内联图片迁移完成');
  } catch (e) {
    console.error('❌ 内联图片迁移失败:', e.message);
  }
}

// 后台启动后异步执行，不阻塞服务
setTimeout(() => migrateInlineImagesOnce(), 1000);
// 兼容少数旧内容直接引用 /public/uploads/images 前缀
app.use('/public/uploads/images', express.static(staticPath));

app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/users", userRoutes);
app.use("/api/user-stats", userStatsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/merchants", merchantsRoutes);

// 添加通用错误处理中间件
app.use((err, req, res, next) => {
  console.error('🚨 服务器错误:', err);
  res.status(500).json({ 
    success: false, 
    error: '服务器内部错误',
    message: err.message 
  });
});

// 处理未匹配的路由（只处理API路由）
app.use('/api', (req, res) => {
  console.log('❌ 未找到API路由:', req.originalUrl);
  res.status(404).json({ 
    success: false, 
    error: 'API路由未找到',
    path: req.originalUrl 
  });
});

// 检查当前用户权限的API端点
app.get("/api/admin/check", authenticateToken, async (req, res) => {
  try {
    res.json({ 
      success: true, 
      user: {
        id: req.user.id,
        username: req.user.username,
        isAdmin: req.user.isAdmin
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '检查权限失败' });
  }
});

// ⚠️ 管理员清空所有帖子的API端点 - 已禁用以防止误操作
// 如需使用，请手动在代码中取消注释，并确保在生产环境中谨慎使用
/*
app.delete("/api/admin/posts/clear", authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ success: false, error: '需要管理员权限' });
    }
    
    await new Promise((resolve, reject) => {
      getDb().query('DELETE FROM forum_posts', (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
    
    await new Promise((resolve, reject) => {
      getDb().query('ALTER TABLE forum_posts AUTO_INCREMENT = 1', (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
    
    res.json({ success: true, message: '所有帖子已清空' });
  } catch (error) {
    console.error('清空帖子失败:', error);
    res.status(500).json({ success: false, error: '清空失败' });
  }
});
*/

// 前后端分离：不再提供前端静态文件服务
// 前端由独立的前端服务提供

// 启动服务器
const startServer = async () => {
    try {
        // 初始化数据库连接
        const db = getDb();
        
        // 先执行数据库迁移
        console.log('执行数据库迁移...');
        try {
            const autoMigrate = await import('./auto-migrate.js');
            await autoMigrate.default();
        } catch (migrateError) {
            console.warn('数据库迁移跳过:', migrateError.message);
            console.log('继续启动服务器...');
        }
        
        // 启动服务器
        app.listen(PORT, () => {
            console.log(`Backend server is running on port ${PORT}!`);
            console.log("Database: MySQL - 连接成功，迁移完成");
        });
    } catch (error) {
        console.error('服务器启动失败:', error);
        process.exit(1);
    }
};

startServer();