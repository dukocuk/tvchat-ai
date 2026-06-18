import React, { useState, useCallback } from 'react';
import { useRelay } from './hooks/useRelay';
import ConnectingScreen from './screens/ConnectingScreen';
import SetupKeyScreen from './screens/SetupKeyScreen';
import ChatInputScreen from './screens/ChatInputScreen';
import ErrorScreen from './screens/ErrorScreen';
import './App.css';

export default function App() {
  // Parse session token and context from the URL
  // URL pattern: /TOKEN?ctx=setup|chat
  var pathname = window.location.pathname;
  var roomId = pathname.replace(/^\//, '').split('/')[0] || '';
  var params = new URLSearchParams(window.location.search);
  var urlCtx = params.get('ctx') || 'chat';

  var [context, setContext] = useState(urlCtx);
  var [tvAcknowledged, setTvAcknowledged] = useState(false);
  // null = no result yet; { ok: true } = TV accepted the key; { ok: false, error } = rejected
  var [keyResult, setKeyResult] = useState(null);
  // Model list + current selection, pushed by the TV. Empty until first model_state.
  var [modelState, setModelState] = useState({ model: null, models: [] });

  var handleMessage = useCallback(function (msg) {
    if (msg.type === 'context') {
      setContext(msg.value || urlCtx);
    } else if (msg.type === 'key_accepted') {
      setKeyResult({ ok: true });
    } else if (msg.type === 'key_rejected') {
      setKeyResult({ ok: false, error: msg.error || 'The TV rejected your key.' });
    } else if (msg.type === 'message_queued') {
      setTvAcknowledged(true);
    } else if (msg.type === 'model_state') {
      setModelState({ model: msg.model || null, models: msg.models || [] });
    }
  }, [urlCtx]);

  var relay = useRelay(roomId, handleMessage);

  if (!roomId) {
    return React.createElement(ErrorScreen, {
      message: 'Invalid pairing URL. Please rescan the QR code on your TV.',
    });
  }

  if (relay.status === 'error') {
    return React.createElement(ErrorScreen, {
      message: 'Cannot reach the relay server. Check your internet connection.',
      onRetry: relay.reconnect,
    });
  }

  if (relay.status === 'disconnected') {
    return React.createElement(ErrorScreen, {
      message: 'Connection lost. Tap to retry.',
      onRetry: relay.reconnect,
    });
  }

  if (relay.status === 'connecting') {
    return React.createElement(ConnectingScreen, { message: 'Connecting to TV…' });
  }

  // TV peer left — still connected to relay, waiting for TV to reconnect
  if (relay.status === 'peer_gone') {
    return React.createElement(ConnectingScreen, {
      message: 'TV disconnected — waiting to reconnect…',
    });
  }

  if (context === 'setup') {
    return React.createElement(SetupKeyScreen, {
      relay: relay,
      keyResult: keyResult,
      onRetry: function () { setKeyResult(null); },
    });
  }

  return React.createElement(ChatInputScreen, {
    relay: relay,
    acknowledged: tvAcknowledged,
    onAck: function () { setTvAcknowledged(false); },
    modelState: modelState,
  });
}
