const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

let realtime = null;

function createNotification(userId, content, type = 'info', relatedId = null) {
  try {
    const result = db.prepare(`
      INSERT INTO notifications (user_id, content, type, related_id)
      VALUES (?, ?, ?, ?)
    `).run(userId, content, type, relatedId);
    const notification = db.prepare('SELECT * FROM notifications WHERE id = ?').get(result.lastInsertRowid);
    realtime?.broadcast({ type: 'notification.created', data: notification }, [userId]);
  } catch (err) {
    console.error('创建通知失败:', err.message);
  }
}

router.get('/', authMiddleware, (req, res) => {
  const { is_read } = req.query;
  let sql = 'SELECT * FROM notifications WHERE user_id = ?';
  const params = [req.user.id];

  if (is_read !== undefined) {
    sql += ' AND is_read = ?';
    params.push(parseInt(is_read));
  }
  sql += ' ORDER BY created_at DESC';

  const notifications = db.prepare(sql).all(...params);
  res.json({ code: 0, msg: 'ok', data: notifications });
});

router.get('/unread/count', authMiddleware, (req, res) => {
  const result = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(req.user.id);
  res.json({ code: 0, msg: 'ok', data: { count: result.count } });
});

router.put('/:id/read', authMiddleware, (req, res) => {
  const notification = db.prepare('SELECT * FROM notifications WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!notification) {
    return res.json({ code: 404, msg: '通知不存在', data: null });
  }
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id);
  res.json({ code: 0, msg: '已标记为已读', data: null });
});

router.put('/read/all', authMiddleware, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ code: 0, msg: '全部已读', data: null });
});

module.exports = router;
module.exports.createNotification = createNotification;
module.exports.setRealtime = (service) => { realtime = service; };