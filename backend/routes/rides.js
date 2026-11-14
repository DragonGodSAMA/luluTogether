const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { createNotification } = require('./notifications');

router.post('/', authMiddleware, (req, res) => {
  const {
    type,
    origin,
    destination,
    departure_time,
    seats,
    price,
    description,
    origin_latitude,
    origin_longitude,
    destination_latitude,
    destination_longitude
  } = req.body;

  if (!type || !origin || !destination || !departure_time) {
    return res.json({ code: 400, msg: '类型、出发地、目的地、出发时间不能为空', data: null });
  }

  if (!['demand', 'supply'].includes(type)) {
    return res.json({ code: 400, msg: '类型无效(demand=拼车需求, supply=拼车线路)', data: null });
  }

  if (type === 'supply' && (!seats || seats < 1)) {
    return res.json({ code: 400, msg: '拼车线路需提供有效座位数', data: null });
  }

  const result = db.prepare(`
    INSERT INTO rides (
      publisher_id, type, origin, destination, departure_time, seats, price, status, description,
      origin_latitude, origin_longitude, destination_latitude, destination_longitude
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?)
  `).run(
    req.user.id,
    type,
    origin,
    destination,
    departure_time,
    seats || 1,
    price || 0,
    description || '',
    Number.isFinite(Number(origin_latitude)) ? Number(origin_latitude) : null,
    Number.isFinite(Number(origin_longitude)) ? Number(origin_longitude) : null,
    Number.isFinite(Number(destination_latitude)) ? Number(destination_latitude) : null,
    Number.isFinite(Number(destination_longitude)) ? Number(destination_longitude) : null
  );

  const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(result.lastInsertRowid);
  req.app.locals.realtime?.broadcast({ type: 'ride.updated', data: { rideId: ride.id, action: 'created' } });
  res.json({ code: 0, msg: '发布成功', data: ride });
});

router.get('/', authMiddleware, (req, res) => {
  const { type, status, keyword } = req.query;
  let sql = `
    SELECT r.*, u.username as publisher_name, u.phone as publisher_phone, u.role as publisher_role
    FROM rides r
    LEFT JOIN users u ON r.publisher_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (type) {
    sql += ' AND r.type = ?';
    params.push(type);
  }
  if (status) {
    sql += ' AND r.status = ?';
    params.push(status);
  } else {
    sql += " AND r.status = 'open'";
  }
  if (keyword) {
    sql += ' AND (r.origin LIKE ? OR r.destination LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  sql += ' ORDER BY r.created_at DESC';
  const rides = db.prepare(sql).all(...params);
  res.json({ code: 0, msg: 'ok', data: rides });
});

router.get('/:id', authMiddleware, (req, res) => {
  const ride = db.prepare(`
    SELECT r.*, u.username as publisher_name, u.phone as publisher_phone, u.role as publisher_role
    FROM rides r
    LEFT JOIN users u ON r.publisher_id = u.id
    WHERE r.id = ?
  `).get(req.params.id);

  if (!ride) {
    return res.json({ code: 404, msg: '拼车信息不存在', data: null });
  }

  const orders = db.prepare(`
    SELECT o.*, u.username as user_name, u.phone as user_phone
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    WHERE o.ride_id = ?
    ORDER BY o.created_at DESC
  `).all(ride.id);

  res.json({ code: 0, msg: 'ok', data: { ...ride, orders } });
});

router.put('/:id/cancel', authMiddleware, (req, res) => {
  const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(req.params.id);
  if (!ride) {
    return res.json({ code: 404, msg: '拼车信息不存在', data: null });
  }
  if (ride.publisher_id !== req.user.id) {
    return res.json({ code: 403, msg: '无权操作', data: null });
  }

  db.prepare("UPDATE rides SET status = 'cancelled' WHERE id = ?").run(req.params.id);

  const orders = db.prepare('SELECT user_id, driver_id FROM orders WHERE ride_id = ? AND status NOT IN (?, ?)').all(req.params.id, 'completed', 'cancelled');
  orders.forEach(o => {
    createNotification(o.user_id, `您参与的拼车(从${ride.origin}到${ride.destination})已被发布者取消`, 'order', ride.id);
  });
  db.prepare("UPDATE orders SET status = 'cancelled', updated_at = datetime('now', 'localtime') WHERE ride_id = ? AND status NOT IN (?, ?)").run(req.params.id, 'completed', 'cancelled');

  req.app.locals.realtime?.broadcast({ type: 'ride.updated', data: { rideId: ride.id, action: 'cancelled' } });
  req.app.locals.realtime?.broadcast({ type: 'order.updated', data: { rideId: ride.id, action: 'cancelled' } }, orders.flatMap((order) => [order.user_id, order.driver_id]));
  res.json({ code: 0, msg: '已取消', data: null });
});

router.get('/my/published', authMiddleware, (req, res) => {
  const rides = db.prepare(`
    SELECT r.*, u.username as publisher_name
    FROM rides r
    LEFT JOIN users u ON r.publisher_id = u.id
    WHERE r.publisher_id = ?
    ORDER BY r.created_at DESC
  `).all(req.user.id);
  res.json({ code: 0, msg: 'ok', data: rides });
});

module.exports = router;
