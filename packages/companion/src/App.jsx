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

  var handleMessage = useCallback(function (msg) {
    if (msg.type === 'context') {
      setContext(msg.value || urlCtx);
    } else if (msg.type === 'key_accepted' || msg.type === 'key_rejected') {
      setTvAcknowledged(true);
    } else if (msg.type === 'message_queued') {
      setTvAcknowledged(true);
    }
  }, [urlCtx]);

  var relay = useRelay(roomId, handleMessage);

  if (!roomId) {
    return React.createElement(ErrorScreen, { message: 'Invalid pairing URL. Please rescan the QR code on your TV.' });
  }

  if (relay.status === 'error' || relay.status === 'disconnected') {
    return React.createElement(ErrorScreen, { message: 'Cannot reach the relay server. Check your internet connection and rescan the QR code.' });
  }

  if (relay.status === 'connecting') {
    return React.createElement(ConnectingScreen, null);
  }

  if (relay.status === 'peer_gone') {
    return React.createElement(ErrorScreen, { message: 'The TV disconnected. Rescan the QR code to reconnect.' });
  }

  if (context === 'setup') {
    return React.createElement(SetupKeyScreen, { relay: relay, acknowledged: tvAcknowledged });
  }

  return React.createElement(ChatInputScreen, { relay: relay, acknowledged: tvAcknowledged, onAck: function () { setTvAcknowledged(false); } });
}
