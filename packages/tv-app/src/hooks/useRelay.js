import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { generateToken } from '../utils/token';

var RELAY_URL = import.meta.env.VITE_RELAY_URL || 'wss://tvchat-relay.onrender.com';
var RECONNECT_DELAY_MS = 3000;

export function useRelay(onMessage) {
  var [status, setStatus] = useState('disconnected');
  var sessionToken = useMemo(function () { return generateToken(8); }, []);
  var wsRef = useRef(null);
  var reconnectTimer = useRef(null);
  var mountedRef = useRef(true);
  var onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  var connect = useCallback(function () {
    if (!mountedRef.current) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    setStatus('connecting');
    var ws;
    try {
      ws = new WebSocket(RELAY_URL);
    } catch (e) {
      setStatus('error');
      return;
    }
    wsRef.current = ws;

    ws.onopen = function () {
      if (!mountedRef.current) { ws.close(); return; }
      setStatus('connected');
      ws.send(JSON.stringify({ type: 'join', room: sessionToken, role: 'tv' }));
    };

    ws.onmessage = function (evt) {
      var msg;
      try { msg = JSON.parse(evt.data); } catch (e) { return; }

      if (msg.type === 'peer_joined') {
        setStatus('peer_connected');
      } else if (msg.type === 'peer_left') {
        setStatus('connected');
      } else {
        onMessageRef.current(msg);
      }
    };

    ws.onclose = function () {
      if (!mountedRef.current) return;
      setStatus('disconnected');
      wsRef.current = null;
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
    };

    ws.onerror = function () {
      ws.close();
    };
  }, [sessionToken]);

  useEffect(function () {
    mountedRef.current = true;
    connect();
    return function () {
      mountedRef.current = false;
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  var send = useCallback(function (payload) {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  return { status: status, sessionToken: sessionToken, send: send };
}
