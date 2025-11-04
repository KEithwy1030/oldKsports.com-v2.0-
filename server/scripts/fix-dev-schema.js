// 简易修复脚本：对齐本地开发数据库结构以匹配 v2 代码
// 幂等：多次执行安全
import { getDb } from '../db.js';

const db = getDb();

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, res) => {
      if (err) return reject(err);
      resolve(res);
    });
  });
}

async function run() {
  try {
    console.log('[schema-fix] start');

    // 黑榜：补齐/对齐列（不使用 IF NOT EXISTS 以适配旧版本，逐列尝试）
    const addCol = async (sql) => { try { await query(sql); } catch (_) {} };
    await addCol("ALTER TABLE blacklist ADD COLUMN merchant_name VARCHAR(100) NULL");
    await addCol("ALTER TABLE blacklist ADD COLUMN violation_type VARCHAR(100) NULL");
    await addCol("ALTER TABLE blacklist ADD COLUMN description TEXT NULL");
    await addCol("ALTER TABLE blacklist ADD COLUMN evidence_urls TEXT NULL");
    await addCol("ALTER TABLE blacklist ADD COLUMN severity ENUM('low','medium','high','critical') DEFAULT 'medium'");
    await addCol("ALTER TABLE blacklist ADD COLUMN status ENUM('pending','verified','resolved','dismissed') DEFAULT 'pending'");
    await addCol("ALTER TABLE blacklist ADD COLUMN created_by INT NULL");
    await addCol("ALTER TABLE blacklist ADD COLUMN verified_by INT NULL");

    // 旧库遗留：将 blacklist.user_id 设置为可空（v1遗留列，不再使用）
    await query("ALTER TABLE blacklist MODIFY COLUMN user_id INT NULL").catch(() => {});

    // 将旧列的数据同步到新列（若存在旧列）
    await query("UPDATE blacklist SET merchant_name = COALESCE(merchant_name, name) WHERE merchant_name IS NULL").catch(() => {});
    await query("UPDATE blacklist SET evidence_urls = COALESCE(evidence_urls, contact_info) WHERE evidence_urls IS NULL").catch(() => {});

    // 商家：补齐可选列并统一枚举
    await addCol("ALTER TABLE merchants ADD COLUMN website VARCHAR(200) NULL");
    await addCol("ALTER TABLE merchants ADD COLUMN logo_url VARCHAR(500) NULL");
    await addCol("ALTER TABLE merchants ADD COLUMN created_by INT NULL");

    await query(
      "ALTER TABLE merchants MODIFY COLUMN category ENUM('gold','advertiser','streamer') NOT NULL DEFAULT 'gold'"
    ).catch(() => {});

    // 新手引导相关表：避免前端因 1146 报错触发错误边界
    await query(
      "CREATE TABLE IF NOT EXISTS onboarding_tasks (" +
        "user_id INT NOT NULL, " +
        "task_id VARCHAR(100) NOT NULL, " +
        "dismissed_forever TINYINT(1) DEFAULT 0, " +
        "updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, " +
        "PRIMARY KEY (user_id, task_id)" +
      ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    ).catch(() => {});

    await query(
      "CREATE TABLE IF NOT EXISTS onboarding_progress (" +
        "user_id INT NOT NULL, " +
        "task_id VARCHAR(100) NOT NULL, " +
        "completed TINYINT(1) DEFAULT 0, " +
        "completed_at TIMESTAMP NULL DEFAULT NULL, " +
        "updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, " +
        "PRIMARY KEY (user_id, task_id)" +
      ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    ).catch(() => {});

    console.log('[schema-fix] done');
    process.exit(0);
  } catch (err) {
    console.error('[schema-fix] failed:', err?.message || err);
    process.exit(1);
  }
}

run();


