const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { createNotification } = require('./notifications');

router.post('/', authMiddleware, (req, res) => {
  const { order_id, score, comment } = req.body;
  if (!order_id || !score) {
    return res.json({ code: 400, msg: '缺少订单id或评分', data: null });
  }
  if (score < 1 || score > 5) {
    return res.json({ code: 400, msg: '评分需在1~5之间', data: null });
  }

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(order_id);
  if (!order) {
    return res.json({ code: 404, msg: '订单不存在', data: null });
  }
  if (order.user_id !== req.user.id) {
    return res.json({ code: 403, msg: '仅乘客可评价司机', data: null });
  }
  if (order.status !== 'completed') {
    return res.json({ code: 400, msg: '仅已完成订单可评价', data: null });
  }

  const existing = db.prepare('SELECT id FROM ratings WHERE order_id = ?').get(order_id);
  if (existing) {
    return res.json({ code: 400, msg: '该订单已评价过', data: null });
  }

  const result = db.prepare(`
    INSERT INTO ratings (order_id, ride_id, passenger_id, driver_id, score, comment)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(order_id, order.ride_id, req.user.id, order.driver_id, score, comment || '');

  const ride = db.prepare('SELECT origin, destination FROM rides WHERE id = ?').get(order.ride_id);
  createNotification(order.driver_id, `您收到一条新评价（行程：${ride.origin}→${ride.destination}），评分${score}星`, 'rating', result.lastInsertRowid);

  const rating = db.prepare(`
    SELECT r.*, u.username as passenger_name
    FROM ratings r LEFT JOIN users u ON r.passenger_id = u.id
    WHERE r.id = ?
  `).get(result.lastInsertRowid);
  req.app.locals.realtime?.broadcast({ type: 'rating.updated', data: { ratingId: rating.id, orderId: order.id, rideId: order.ride_id } }, [order.driver_id]);
  res.json({ code: 0, msg: '评价成功', data: rating });
});

router.get('/driver/:driverId', (req, res) => {
  const driverId = req.params.driverId;
  const stats = db.prepare(`
    SELECT COUNT(*) as count, ROUND(AVG(score), 1) as avg_score
    FROM ratings WHERE driver_id = ?
  `).get(driverId);

  const recent = db.prepare(`
    SELECT r.id, r.order_id, r.score, r.comment, r.created_at,
           u.username as passenger_name
    FROM ratings r LEFT JOIN users u ON r.passenger_id = u.id
    WHERE r.driver_id = ?
    ORDER BY r.created_at DESC
    LIMIT 10
  `).all(driverId);

  res.json({
    code: 0,
    msg: 'ok',
    data: {
      avg_score: stats.avg_score || 0,
      total_count: stats.count || 0,
      recent
    }
  });
});

router.get('/order/:orderId', authMiddleware, (req, res) => {
  const rating = db.prepare(`
    SELECT r.*, u.username as passenger_name
    FROM ratings r LEFT JOIN users u ON r.passenger_id = u.id
    WHERE r.order_id = ?
  `).get(req.params.orderId);
  res.json({ code: 0, msg: 'ok', data: rating || null });
});

module.exports = router;