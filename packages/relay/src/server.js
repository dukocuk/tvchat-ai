const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 3001;
const MAX_MESSAGE_BYTES = 5 * 1024 * 1024; // 5 MB (base64 images)
const PING_INTERVAL_MS = 30_000;
const ROOM_MAX_PEERS = 2;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocket.Server({ server });

// rooms: Map<roomId, Map<role('tv'|'phone'), WebSocket>>
const rooms = new Map();

wss.on('connection', (ws) => {
  let roomId = null;
  let role = null;

  const pingTimer = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) ws.ping();
  }, PING_INTERVAL_MS);

  function send(socket, payload) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
    }
  }

  function cleanup() {
    clearInterval(pingTimer);
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    room.delete(role);

    room.forEach((peer) => send(peer, { type: 'peer_left' }));

    if (room.size === 0) rooms.delete(roomId);
  }

  ws.on('message', (raw) => {
    if (raw.length > MAX_MESSAGE_BYTES) {
      send(ws, { type: 'error', message: 'message too large' });
      return;
    }

    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.type === 'join') {
      if (!msg.room || !msg.role) return;

      roomId = String(msg.room).slice(0, 64);
      role = msg.role === 'phone' ? 'phone' : 'tv';

      if (!rooms.has(roomId)) rooms.set(roomId, new Map());
      const room = rooms.get(roomId);

      if (room.size >= ROOM_MAX_PEERS && !room.has(role)) {
        send(ws, { type: 'error', message: 'room full' });
        return;
      }

      room.set(role, ws);

      if (room.size === ROOM_MAX_PEERS) {
        room.forEach((peer) => send(peer, { type: 'peer_joined' }));
      }
      return;
    }

    // Relay to every other peer in the same room
    if (!roomId || !rooms.has(roomId)) return;
    const room = rooms.get(roomId);
    room.forEach((peer, peerRole) => {
      if (peerRole !== role && peer.readyState === WebSocket.OPEN) {
        peer.send(raw.toString());
      }
    });
  });

  ws.on('close', cleanup);
  ws.on('error', cleanup);
});

server.listen(PORT, () => {
  console.log('clautv relay listening on port ' + PORT);
});
