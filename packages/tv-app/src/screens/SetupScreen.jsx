import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import './SetupScreen.css';

var COMPANION_URL = import.meta.env.VITE_COMPANION_URL || 'https://companion.clautv.ai';

var STATUS_LABELS = {
  disconnected:   'Connecting to relay…',
  connecting:     'Connecting to relay…',
  connected:      'Waiting for phone — scan the QR code',
  peer_connected: 'Phone connected! Enter your API key.',
  error:          'Relay connection failed. Retrying…',
};

var SLOW_CONNECT_SECS = 8; // after this many seconds, show the warm-up hint

export default function SetupScreen(props) {
  var relay = props.relay;
  var pairingUrl = COMPANION_URL + '/' + relay.sessionToken + '?ctx=setup';
  var statusText = STATUS_LABELS[relay.status] || relay.status;
  var phoneConnected = relay.status === 'peer_connected';

  var [slowConnect, setSlowConnect] = useState(false);

  // If still connecting after SLOW_CONNECT_SECS, surface the warm-up hint
  useEffect(function () {
    var isConnecting = relay.status === 'connecting' || relay.status === 'disconnected';
    if (!isConnecting) {
      setSlowConnect(false);
      return;
    }

    var timer = setTimeout(function () {
      setSlowConnect(true);
    }, SLOW_CONNECT_SECS * 1000);

    return function () { clearTimeout(timer); };
  }, [relay.status]);

  return React.createElement(
    'div',
    { className: 'setup-screen' },

    React.createElement(
      'div',
      { className: 'setup-logo' },
      React.createElement('span', { className: 'setup-logo-text' }, 'clautv'),
      React.createElement('span', { className: 'setup-logo-ai' }, '-ai')
    ),

    React.createElement('p', { className: 'setup-tagline' }, 'AI chat powered by Claude'),

    React.createElement(
      'div',
      { className: 'setup-qr-wrap' + (phoneConnected ? ' setup-qr-wrap--connected' : '') },
      React.createElement(QRCodeSVG, {
        value: pairingUrl,
        size: 280,
        bgColor: '#ffffff',
        fgColor: '#0a0a0a',
        level: 'M',
      })
    ),

    React.createElement(
      'div',
      { className: 'setup-status' },
      React.createElement('span', {
        className: 'setup-status-dot setup-status-dot--' + relay.status,
      }),
      React.createElement('span', { className: 'setup-status-text' }, statusText)
    ),

    // Slow-connect hint shown after SLOW_CONNECT_SECS of waiting
    slowConnect && React.createElement(
      'p',
      { className: 'setup-warmup-hint' },
      'Still connecting… relay may be warming up. This can take ~10 s on first load.'
    ),

    React.createElement(
      'p',
      { className: 'setup-instructions' },
      'Scan with your phone camera, then type your',
      React.createElement('br', null),
      'Anthropic API key. No account needed on TV.'
    )
  );
}
