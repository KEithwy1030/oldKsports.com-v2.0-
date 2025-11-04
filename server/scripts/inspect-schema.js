import { getDb } from '../db.js';

const db = getDb();

function q(sql) {
  return new Promise((resolve, reject) => db.query(sql, (e, r) => e ? reject(e) : resolve(r)));
}

(async () => {
  try {
    const [b, m, n] = await Promise.all([
      q('SHOW COLUMNS FROM blacklist'),
      q('SHOW COLUMNS FROM merchants'),
      q('SHOW COLUMNS FROM notifications')
    ]);
    console.log('blacklist columns:', b.map(x => x.Field));
    console.log('merchants columns:', m.map(x => x.Field));
    console.log('notifications columns:', n.map(x => x.Field));
    process.exit(0);
  } catch (e) {
    console.error('inspect failed:', e.message);
    process.exit(1);
  }
})();


