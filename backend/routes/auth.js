const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../db/database');
const { generateToken, authMiddleware } = require('../middleware/auth');

router.post('/register', (req, res) => {
  const { username, password, phone, role } = req.body;
  if (!username || !password || !phone) {
    return res.json({ code: 400, msg: '用户名、密码、手机号不能为空', data: null });
  }
  if (password.length < 6) {
    return res.json({ code: 400, msg: '密码长度至少6位', data: null });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.json({ code: 400, msg: '用户名已存在', data: null });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const userRole = role === 'driver' ? 'driver' : 'passenger';

  const result = db.prepare(
    'INSERT INTO users (username, password, phone, role) VALUES (?, ?, ?, ?)'
  ).run(username, hashedPassword, phone, userRole);

  const user = db.prepare('SELECT id, username, phone, role, avatar, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
  const token = generateToken(user);

  res.json({ code: 0, msg: '注册成功', data: { token, user } });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.json({ code: 400, msg: '用户名和密码不能为空', data: null });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    return res.json({ code: 400, msg: '用户不存在', data: null });
  }

  if (!bcrypt.compareSync(password, user.password)) {
    return res.json({ code: 400, msg: '密码错误', data: null });
  }

  const token = generateToken(user);
  const userInfo = {
    id: user.id,
    username: user.username,
    phone: user.phone,
    role: user.role,
    avatar: user.avatar,
    created_at: user.created_at
  };

  res.json({ code: 0, msg: '登录成功', data: { token, user: userInfo } });
});

router.get('/info', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, username, phone, role, avatar, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.json({ code: 404, msg: '用户不存在', data: null });
  }
  res.json({ code: 0, msg: 'ok', data: user });
});

router.put('/role', authMiddleware, (req, res) => {
  const { role } = req.body;
  if (!['passenger', 'driver', 'both'].includes(role)) {
    return res.json({ code: 400, msg: '角色类型无效', data: null });
  }

  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.user.id);
  const user = db.prepare('SELECT id, username, phone, role, avatar, created_at FROM users WHERE id = ?').get(req.user.id);
  const token = generateToken(user);

  res.json({ code: 0, msg: '角色切换成功', data: { token, user } });
});

module.exports = router;