const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { createNotification } = require('./notifications');

router.post('/join', authMiddleware, (req, res) => {
  const { ride_id } = req.body;
  const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(ride_id);

  if (!ride) {
    return res.json({ code: 404, msg: '拼车信息不存在', data: null });
  }
  if (ride.type !== 'supply') {
    return res.json({ code: 400, msg: '该信息为拼车需求，请使用接单功能', data: null });
  }
  if (ride.status !== 'open') {
    return res.json({ code: 400, msg: '该拼车线路已不可加入', data: null });
  }
  if (ride.publisher_id === req.user.id) {
    return res.json({ code: 400, msg: '不能加入自己发布的拼车', data: null });
  }

  const existingOrder = db.prepare('SELECT id FROM orders WHERE ride_id = ? AND user_id = ? AND status NOT IN (?, ?)').get(ride_id, req.user.id, 'completed', 'cancelled');
  if (existingOrder) {
    return res.json({ code: 400, msg: '您已加入该拼车', data: null });
  }

  if (ride.current_passengers >= ride.seats) {
    return res.json({ code: 400, msg: '座位已满', data: null });
  }

  const result = db.prepare(`
    INSERT INTO orders (ride_id, user_id, driver_id, status)
    VALUES (?, ?, ?, 'pending')
  `).run(ride_id, req.user.id, ride.publisher_id);

  db.prepare('UPDATE rides SET current_passengers = current_passengers + 1 WHERE id = ?').run(ride_id);
  if (ride.current_passengers + 1 >= ride.seats) {
    db.prepare("UPDATE rides SET status = 'full' WHERE id = ?").run(ride_id);
  }

  createNotification(ride.publisher_id, `有新乘客加入您的拼车线路(从${ride.origin}到${ride.destination})，请确认`, 'order', ride_id);

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(result.lastInsertRowid);
  req.app.locals.realtime?.broadcast({ type: 'ride.updated', data: { rideId: ride.id, action: 'joined' } });
  req.app.locals.realtime?.broadcast({ type: 'order.updated', data: { orderId: order.id, rideId: ride.id, action: 'created' } }, [ride.publisher_id, req.user.id]);
  res.json({ code: 0, msg: '加入成功，等待司机确认', data: order });
});

router.post('/accept', authMiddleware, (req, res) => {
  const { ride_id } = req.body;
  const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(ride_id);

  if (!ride) {
    return res.json({ code: 404, msg: '拼车信息不存在', data: null });
  }
  if (ride.type !== 'demand') {
    return res.json({ code: 400, msg: '该信息为拼车线路，请使用加入功能', data: null });
  }
  if (ride.status !== 'open') {
    return res.json({ code: 400, msg: '该拼车需求已被接单', data: null });
  }
  if (ride.publisher_id === req.user.id) {
    return res.json({ code: 400, msg: '不能接单自己发布的需求', data: null });
  }

  const result = db.prepare(`
    INSERT INTO orders (ride_id, user_id, driver_id, status)
    VALUES (?, ?, ?, 'pending')
  `).run(ride_id, ride.publisher_id, req.user.id);

  db.prepare("UPDATE rides SET status = 'full' WHERE id = ?").run(ride_id);

  createNotification(ride.publisher_id, `有司机接单了您的拼车需求(从${ride.origin}到${ride.destination})，请确认`, 'order', ride_id);

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(result.lastInsertRowid);
  req.app.locals.realtime?.broadcast({ type: 'ride.updated', data: { rideId: ride.id, action: 'accepted' } });
  req.app.locals.realtime?.broadcast({ type: 'order.updated', data: { orderId: order.id, rideId: ride.id, action: 'created' } }, [ride.publisher_id, req.user.id]);
  res.json({ code: 0, msg: '接单成功，等待乘客确认', data: order });
});

router.put('/:id/confirm', authMiddleware, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) {
    return res.json({ code: 404, msg: '订单不存在', data: null });
  }

  const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(order.ride_id);
  const isPublisher = ride.publisher_id === req.user.id;
  const isJoiner = order.user_id === req.user.id;

  if (!isPublisher && !isJoiner) {
    return res.json({ code: 403, msg: '无权操作', data: null });
  }
  if (order.status !== 'pending') {
    return res.json({ code: 400, msg: '订单状态不允许确认', data: null });
  }

  db.prepare("UPDATE orders SET status = 'confirmed', updated_at = datetime('now', 'localtime') WHERE id = ?").run(req.params.id);

  const notifyUserId = isPublisher ? order.user_id : ride.publisher_id;
  createNotification(notifyUserId, `订单已确认(从${ride.origin}到${ride.destination})`, 'order', order.ride_id);

  req.app.locals.realtime?.broadcast({ type: 'order.updated', data: { orderId: order.id, rideId: order.ride_id, action: 'confirmed' } }, [order.user_id, order.driver_id]);
  res.json({ code: 0, msg: '已确认', data: null });
});

router.put('/:id/start', authMiddleware, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) {
    return res.json({ code: 404, msg: '订单不存在', data: null });
  }
  if (order.driver_id !== req.user.id && order.user_id !== req.user.id) {
    return res.json({ code: 403, msg: '无权操作', data: null });
  }
  if (order.status !== 'confirmed') {
    return res.json({ code: 400, msg: '仅已确认订单可开始行程', data: null });
  }

  db.prepare("UPDATE orders SET status = 'ongoing', updated_at = datetime('now', 'localtime') WHERE id = ?").run(req.params.id);

  const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(order.ride_id);
  const notifyUserId = order.driver_id === req.user.id ? order.user_id : order.driver_id;
  createNotification(notifyUserId, `行程已开始(从${ride.origin}到${ride.destination})`, 'order', order.ride_id);

  req.app.locals.realtime?.broadcast({ type: 'order.updated', data: { orderId: order.id, rideId: order.ride_id, action: 'started' } }, [order.user_id, order.driver_id]);
  res.json({ code: 0, msg: '行程已开始', data: null });
});

router.put('/:id/complete', authMiddleware, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) {
    return res.json({ code: 404, msg: '订单不存在', data: null });
  }
  if (order.driver_id !== req.user.id && order.user_id !== req.user.id) {
    return res.json({ code: 403, msg: '无权操作', data: null });
  }
  if (order.status !== 'ongoing') {
    return res.json({ code: 400, msg: '仅进行中订单可完成', data: null });
  }

  db.prepare("UPDATE orders SET status = 'completed', updated_at = datetime('now', 'localtime') WHERE id = ?").run(req.params.id);

  const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(order.ride_id);
  const notifyUserId = order.driver_id === req.user.id ? order.user_id : order.driver_id;
  createNotification(notifyUserId, `行程已完成(从${ride.origin}到${ride.destination})`, 'order', order.ride_id);

  req.app.locals.realtime?.broadcast({ type: 'order.updated', data: { orderId: order.id, rideId: order.ride_id, action: 'completed' } }, [order.user_id, order.driver_id]);
  res.json({ code: 0, msg: '行程已完成', data: null });
});

router.put('/:id/cancel', authMiddleware, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) {
    return res.json({ code: 404, msg: '订单不存在', data: null });
  }
  if (order.driver_id !== req.user.id && order.user_id !== req.user.id) {
    return res.json({ code: 403, msg: '无权操作', data: null });
  }
  if (['completed', 'cancelled'].includes(order.status)) {
    return res.json({ code: 400, msg: '订单已结束', data: null });
  }

  db.prepare("UPDATE orders SET status = 'cancelled', updated_at = datetime('now', 'localtime') WHERE id = ?").run(req.params.id);

  const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(order.ride_id);
  if (ride.type === 'supply' && ride.status === 'full') {
    db.prepare('UPDATE rides SET current_passengers = current_passengers - 1 WHERE id = ?').run(order.ride_id);
    db.prepare("UPDATE rides SET status = 'open' WHERE id = ? AND current_passengers < seats").run(order.ride_id);
  }

  const notifyUserId = order.driver_id === req.user.id ? order.user_id : order.driver_id;
  createNotification(notifyUserId, `订单已取消(从${ride.origin}到${ride.destination})`, 'order', order.ride_id);

  req.app.locals.realtime?.broadcast({ type: 'ride.updated', data: { rideId: ride.id, action: 'order-cancelled' } });
  req.app.locals.realtime?.broadcast({ type: 'order.updated', data: { orderId: order.id, rideId: order.ride_id, action: 'cancelled' } }, [order.user_id, order.driver_id]);
  res.json({ code: 0, msg: '已取消', data: null });
});

router.get('/my', authMiddleware, (req, res) => {
  const { role, status } = req.query;
  let sql = `
    SELECT o.*, r.origin, r.destination, r.departure_time, r.price, r.type as ride_type,
           u1.username as user_name, u1.phone as user_phone,
           u2.username as driver_name, u2.phone as driver_phone
    FROM orders o
    LEFT JOIN rides r ON o.ride_id = r.id
    LEFT JOIN users u1 ON o.user_id = u1.id
    LEFT JOIN users u2 ON o.driver_id = u2.id
    WHERE 1=1
  `;
  const params = [];

  if (role === 'passenger') {
    sql += ' AND o.user_id = ?';
    params.push(req.user.id);
  } else if (role === 'driver') {
    sql += ' AND o.driver_id = ?';
    params.push(req.user.id);
  } else {
    sql += ' AND (o.user_id = ? OR o.driver_id = ?)';
    params.push(req.user.id, req.user.id);
  }

  if (status) {
    sql += ' AND o.status = ?';
    params.push(status);
  }

  sql += ' ORDER BY o.created_at DESC';
  const orders = db.prepare(sql).all(...params);
  res.json({ code: 0, msg: 'ok', data: orders });
});

module.exports = router;