import React, { useCallback, useState } from 'react';
import { useApp } from './context/AppContext';
import { useRelay } from './hooks/useRelay';
import { useClaudeAPI } from './hooks/useClaudeAPI';
import SetupScreen from './screens/SetupScreen';
import ChatScreen from './screens/ChatScreen';
import SettingsPanel from './screens/SettingsPanel';
import { toApiMessages } from './utils/conversations';

export default function App() {
  var ctx = useApp();
  var state = ctx.state;
  var dispatch = ctx.dispatch;

  var claude = useClaudeAPI();
  var [previewText, setPreviewText] = useState('');

  var handleRelayMessage = useCallback(function (msg) {
    if (msg.type === 'api_key') {
      validateKey(msg.value, dispatch, relayRef);
    } else if (msg.type === 'chat_message') {
      setPreviewText('');
      submitMessage(msg.text || '', null, null, state, dispatch, claude, relayRef);
    } else if (msg.type === 'image_message') {
      setPreviewText('');
      submitMessage(msg.text || '', msg.base64, msg.mimeType, state, dispatch, claude, relayRef);
    } else if (msg.type === 'input_preview') {
      setPreviewText(msg.text || '');
    }
  }, [state, dispatch, claude]);

  var relay = useRelay(handleRelayMessage);

  // Stable ref so callbacks always have the latest send function
  var relayRef = React.useRef(relay.send);
  relayRef.current = relay.send;

  // Inform phone of current context whenever it connects or screen changes
  React.useEffect(function () {
    if (relay.status === 'peer_connected') {
      relay.send({ type: 'context', value: state.screen });
    }
  }, [state.screen, relay.status]);

  // Clear preview text when conversation changes
  var activeConvId = state.activeConversation ? state.activeConversation.id : null;
  React.useEffect(function () {
    setPreviewText('');
  }, [activeConvId]);

  return React.createElement(
    React.Fragment,
    null,
    state.screen === 'setup'
      ? React.createElement(SetupScreen, { relay: relay, setupError: state.setupError })
      : React.createElement(ChatScreen, { relay: relay, previewText: previewText }),
    state.settingsOpen && React.createElement(SettingsPanel, null)
  );
}

function validateKey(key, dispatch, relayRef) {
  fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'hi' }],
    }),
  })
    .then(function (res) {
      // Only 401/403 mean the key itself was rejected (unauthenticated / forbidden).
      // Any other status (200, 400 minimal-body, 404 model-not-enabled, 429, 529, …) means
      // the key authenticated fine — accept it. Otherwise a perfectly valid key that hits a
      // rate limit or a model gating issue would look "rejected" and leave the TV on the QR.
      if (res.status === 401 || res.status === 403) {
        var err = 'Invalid API key (status ' + res.status + ')';
        dispatch({ type: 'KEY_REJECTED', error: err });
        relayRef.current({ type: 'key_rejected', error: err });
      } else {
        dispatch({ type: 'API_KEY_SET', key: key });
        relayRef.current({ type: 'key_accepted' });
      }
    })
    .catch(function () {
      var netErr = 'Network error reaching api.anthropic.com';
      dispatch({ type: 'KEY_REJECTED', error: netErr });
      relayRef.current({ type: 'key_rejected', error: netErr });
    });
}

function submitMessage(text, imageBase64, imageMimeType, state, dispatch, claude, relayRef) {
  if (!state.apiKey || state.isStreaming) return;

  var content = [];
  if (imageBase64) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: imageMimeType || 'image/jpeg', data: imageBase64 },
    });
  }
  if (text) {
    content.push({ type: 'text', text: text });
  }
  if (content.length === 0) return;

  var conv = state.activeConversation;
  if (!conv) return;

  dispatch({ type: 'MESSAGE_USER_ADD', content: content });

  var apiMessages = toApiMessages(conv).concat([{ role: 'user', content: content }]);

  claude.sendMessage(
    state.apiKey,
    state.model,
    state.systemPrompt,
    apiMessages,
    function (token) { dispatch({ type: 'STREAM_TOKEN', text: token }); },
    function (err) {
      if (err) {
        dispatch({ type: 'API_ERROR', message: err });
      } else {
        dispatch({ type: 'STREAM_DONE' });
        relayRef.current({ type: 'message_queued' });
      }
    }
  );
}
