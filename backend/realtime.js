const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const { SECRET_KEY } = require('./middleware/auth');

function createRealtimeServer(server) {
  const clientsByUser = new Map();
  const websocketServer = new WebSocketServer({ server, path: '/ws' });

  function addClient(userId, socket) {
    if (!clientsByUser.has(userId)) clientsByUser.set(userId, new Set());
    clientsByUser.get(userId).add(socket);
  }

  function removeClient(userId, socket) {
    const clients = clientsByUser.get(userId);
    if (!clients) return;
    clients.delete(socket);
    if (clients.size === 0) clientsByUser.delete(userId);
  }

  function send(socket, event) {
    if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(event));
  }

  function broadcast(event, userIds = null) {
    if (userIds === null) {
      for (const clients of clientsByUser.values()) {
        for (const socket of clients) send(socket, event);
      }
      return;
    }

    for (const userId of new Set(userIds.filter(Boolean))) {
      for (const socket of clientsByUser.get(userId) || []) send(socket, event);
    }
  }

  websocketServer.on('connection', (socket, request) => {
    const token = new URL(request.url, 'http://localhost').searchParams.get('token');
    let user;
    try {
      user = jwt.verify(token || '', SECRET_KEY);
    } catch {
      socket.close(1008, '未登录或token无效');
      return;
    }

    addClient(user.id, socket);
    send(socket, { type: 'realtime.ready', data: { userId: user.id } });

    socket.on('close', () => removeClient(user.id, socket));
    socket.on('error', () => removeClient(user.id, socket));
  });

  return { broadcast };
}

module.exports = { createRealtimeServer };