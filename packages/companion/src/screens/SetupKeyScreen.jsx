import React, { useState } from 'react';
import '../App.css';
import './screens.css';

export default function SetupKeyScreen(props) {
  var relay = props.relay;
  var acknowledged = props.acknowledged;

  var [key, setKey] = useState('');
  var [showKey, setShowKey] = useState(false);
  var [sent, setSent] = useState(false);

  function handleSend() {
    var trimmed = key.trim();
    if (!trimmed || !trimmed.startsWith('sk-ant-')) return;
    relay.send({ type: 'api_key', value: trimmed });
    setSent(true);
  }

  if (acknowledged) {
    return React.createElement(
      'div',
      { className: 'screen' },
      React.createElement('div', { className: 'success-icon' }, '✓'),
      React.createElement('p', { className: 'success-text' }, 'API key accepted!'),
      React.createElement('p', { className: 'success-sub' }, 'You can now chat on your TV.')
    );
  }

  if (sent) {
    return React.createElement(
      'div',
      { className: 'screen' },
      React.createElement('div', { className: 'connecting-spinner' }, '◌'),
      React.createElement('p', { className: 'connecting-text' }, 'Verifying key on TV…')
    );
  }

  var isValid = key.trim().startsWith('sk-ant-') && key.trim().length > 20;

  return React.createElement(
    'div',
    { className: 'screen screen--top', style: { justifyContent: 'flex-start', paddingTop: 40 } },

    // Header
    React.createElement(
      'div',
      { className: 'screen-header' },
      React.createElement(
        'div',
        { className: 'logo' },
        'clautv',
        React.createElement('span', null, '-ai')
      ),
      React.createElement('p', { className: 'screen-title' }, 'Enter your Anthropic API key')
    ),

    // Key input
    React.createElement(
      'div',
      { className: 'input-group' },
      React.createElement(
        'div',
        { className: 'input-wrap' },
        React.createElement('input', {
          type: showKey ? 'text' : 'password',
          className: 'key-input',
          value: key,
          onChange: function (e) { setKey(e.target.value); },
          placeholder: 'sk-ant-api03-…',
          autoComplete: 'off',
          autoCorrect: 'off',
          autoCapitalize: 'off',
          spellCheck: false,
        }),
        React.createElement(
          'button',
          {
            className: 'key-toggle',
            onClick: function () { setShowKey(!showKey); },
            type: 'button',
          },
          showKey ? '🙈' : '👁'
        )
      ),
      React.createElement(
        'p',
        { className: 'input-hint' },
        'Find yours at console.anthropic.com → API Keys'
      )
    ),

    React.createElement(
      'button',
      {
        className: 'send-btn' + (isValid ? '' : ' send-btn--disabled'),
        onClick: handleSend,
        disabled: !isValid,
      },
      'Send to TV'
    ),

    React.createElement(
      'p',
      { className: 'privacy-note' },
      'Your key is sent directly to your TV over an encrypted WebSocket. It is never stored on any server.'
    )
  );
}
