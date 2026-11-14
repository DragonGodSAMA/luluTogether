const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const { initDatabase } = require('./db/database');
const authRoutes = require('./routes/auth');
const rideRoutes = require('./routes/rides');
const orderRoutes = require('./routes/orders');
const notificationRoutes = require('./routes/notifications');
const ratingRoutes = require('./routes/ratings');
const { createRealtimeServer } = require('./realtime');

const app = express();
const PORT = process.env.PORT || 3000;
const APP_ID = 'hainan-carpool-4.7-ui-1.5';
const frontendDist = path.resolve(__dirname, '..', 'frontend', 'dist');
const projectRoot = path.resolve(__dirname, '..');
const runtimeDir = path.join(projectRoot, 'runtime');
const pidFile = path.join(runtimeDir, 'carpool-server.pid');
const isManagedLaunch = process.env.CARPOOL_MANAGED_BROWSER === '1';
const pageSessions = new Map();
const SESSION_TIMEOUT_MS = 20000;
const EMPTY_SESSION_GRACE_MS = 4000;
const INITIAL_PAGE_GRACE_MS = 30000;
const startedAt = Date.now();
let managedBrowser = null;
let shuttingDown = false;
let emptySessionTimer = null;
let hasSeenPageSession = false;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

initDatabase();

app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ratings', ratingRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    code: 0,
    msg: 'ok',
    data: {
      status: 'running',
      appId: APP_ID,
      version: '4.7-ui-1.5',
      pid: process.pid,
      managedLaunch: isManagedLaunch
    }
  });
});

function isLoopbackRequest(req) {
  const address = req.socket.remoteAddress || '';
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
}

function cancelEmptySessionShutdown() {
  if (!emptySessionTimer) return;
  clearTimeout(emptySessionTimer);
  emptySessionTimer = null;
}

function scheduleEmptySessionShutdown() {
  if (!isManagedLaunch || shuttingDown || pageSessions.size > 0 || emptySessionTimer) return;
  if (!hasSeenPageSession && Date.now() - startedAt < INITIAL_PAGE_GRACE_MS) return;
  emptySessionTimer = setTimeout(() => {
    emptySessionTimer = null;
    if (pageSessions.size === 0) {
      console.log('应用页面已全部关闭，正在停止本地服务...');
      stopApplication(0);
    }
  }, EMPTY_SESSION_GRACE_MS);
}

app.post('/api/runtime/session', (req, res) => {
  if (!isLoopbackRequest(req)) return res.status(403).json({ code: 403, msg: '仅允许本机访问' });
  const sessionId = String(req.body?.sessionId || '').trim().slice(0, 100);
  if (!sessionId) return res.status(400).json({ code: 400, msg: '缺少页面会话标识' });
  cancelEmptySessionShutdown();
  hasSeenPageSession = true;
  pageSessions.set(sessionId, Date.now());
  res.json({ code: 0, msg: 'ok' });
});

app.post('/api/runtime/session/close', (req, res) => {
  if (!isLoopbackRequest(req)) return res.status(403).json({ code: 403, msg: '仅允许本机访问' });
  const sessionId = String(req.body?.sessionId || '').trim().slice(0, 100);
  if (sessionId) pageSessions.delete(sessionId);
  res.status(204).end();
  scheduleEmptySessionShutdown();
});

app.use(express.static(frontendDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(frontendDist, 'index.html'), (error) => {
    if (error) next(error);
  });
});

app.use((err, req, res, next) => {
  console.error('服务器错误:', err.message);
  res.status(500).json({ code: 500, msg: '服务器内部错误', data: null });
});

function findBrowser() {
  const candidates = [
    process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe')
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate));
}

function stopApplication(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  cancelEmptySessionShutdown();
  clearInterval(sessionCleanupTimer);
  try {
    if (fs.existsSync(pidFile) && fs.readFileSync(pidFile, 'utf8').trim() === String(process.pid)) {
      fs.unlinkSync(pidFile);
    }
  } catch (error) {
    console.warn('清理进程记录失败:', error.message);
  }
  if (managedBrowser && !managedBrowser.killed) managedBrowser.kill();
  server.close(() => process.exit(exitCode));
  setTimeout(() => process.exit(exitCode), 3000).unref();
}

function launchManagedBrowser() {
  if (process.env.CARPOOL_SKIP_BROWSER === '1') return;
  const browserPath = findBrowser();
  if (!browserPath) {
    console.log(`未找到 Chrome 或 Edge，请手动打开 http://127.0.0.1:${PORT}`);
    return;
  }

  const profilePath = path.join(projectRoot, 'runtime', 'browser-profile-4.7');
  fs.mkdirSync(profilePath, { recursive: true });
  managedBrowser = spawn(browserPath, [
    `--app=http://127.0.0.1:${PORT}`,
    `--user-data-dir=${profilePath}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-mode'
  ], { stdio: 'ignore', windowsHide: false });

  managedBrowser.once('error', (error) => {
    console.error('浏览器启动失败:', error.message);
    console.log(`请手动打开 http://127.0.0.1:${PORT}`);
  });
  managedBrowser.once('exit', () => {
    if (!shuttingDown) {
      console.log('应用窗口已关闭，正在停止服务...');
      stopApplication(0);
    }
  });
}

const server = app.listen(PORT, () => {
  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.writeFileSync(pidFile, String(process.pid), 'utf8');
  console.log(`拼车系统后端服务已启动: http://localhost:${PORT}`);
  console.log(`健康检查: http://localhost:${PORT}/api/health`);
  if (isManagedLaunch) launchManagedBrowser();
});

const realtime = createRealtimeServer(server);
app.locals.realtime = realtime;
notificationRoutes.setRealtime(realtime);

const sessionCleanupTimer = setInterval(() => {
  const staleBefore = Date.now() - SESSION_TIMEOUT_MS;
  for (const [sessionId, lastSeenAt] of pageSessions) {
    if (lastSeenAt < staleBefore) pageSessions.delete(sessionId);
  }
  scheduleEmptySessionShutdown();
}, 5000);
sessionCleanupTimer.unref();

process.on('SIGINT', () => stopApplication(0));
process.on('SIGTERM', () => stopApplication(0));
