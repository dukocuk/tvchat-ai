import { useEffect, useRef, useCallback, useState } from 'react';

var RELAY_URL = import.meta.env.VITE_RELAY_URL || 'wss://tvchat-relay.onrender.com';

export function useRelay(roomId, onMessage) {
  var [status, setStatus] = useState('connecting');
  var [reconnectKey, setReconnectKey] = useState(0);
  var wsRef = useRef(null);
  var onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(function () {
    if (!roomId) {
      setStatus('error');
      return;
    }

    var ws;
    try {
      ws = new WebSocket(RELAY_URL);
    } catch (e) {
      setStatus('error');
      return;
    }
    wsRef.current = ws;
    setStatus('connecting');

    ws.onopen = function () {
      ws.send(JSON.stringify({ type: 'join', room: roomId, role: 'phone' }));
    };

    ws.onmessage = function (evt) {
      var msg;
      try { msg = JSON.parse(evt.data); } catch (e) { return; }

      if (msg.type === 'peer_joined' || msg.type === 'context') {
        setStatus('connected');
        onMessageRef.current(msg);
      } else if (msg.type === 'peer_left') {
        // TV disconnected — stay on relay, waiting for TV to come back
        setStatus('peer_gone');
      } else {
        onMessageRef.current(msg);
      }
    };

    ws.onclose = function () {
      setStatus('disconnected');
    };

    ws.onerror = function () {
      setStatus('error');
    };

    return function () {
      ws.close();
    };
  }, [roomId, reconnectKey]);

  var send = useCallback(function (payload) {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  var reconnect = useCallback(function () {
    if (wsRef.current) {
      wsRef.current.close();
    }
    setReconnectKey(function (k) { return k + 1; });
  }, []);

  return { status: status, send: send, reconnect: reconnect };
}
