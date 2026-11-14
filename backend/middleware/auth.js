const jwt = require('jsonwebtoken');
const SECRET_KEY = 'carpool_secret_key_2026';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    SECRET_KEY,
    { expiresIn: '7d' }
  );
}

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ code: 401, msg: '未登录或token缺失', data: null });
  }
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ code: 401, msg: 'token无效或已过期', data: null });
  }
}

module.exports = { generateToken, authMiddleware, SECRET_KEY };