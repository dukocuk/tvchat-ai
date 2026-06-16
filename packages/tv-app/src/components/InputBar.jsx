import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import './InputBar.css';

var COMPANION_URL = import.meta.env.VITE_COMPANION_URL || 'https://companion.clautv.ai';

export default function InputBar(props) {
  var relay = props.relay;
  var previewText = props.previewText;
  var isStreaming = props.isStreaming;

  var pairingUrl = COMPANION_URL + '/' + relay.sessionToken + '?ctx=chat';
  var phoneConnected = relay.status === 'peer_connected';

  return React.createElement(
    'div',
    { className: 'input-bar' },

    // Left: QR + pairing hint
    React.createElement(
      'div',
      { className: 'input-bar-qr' },
      React.createElement(
        'div',
        { className: 'input-bar-qr-code' + (phoneConnected ? ' input-bar-qr-code--connected' : '') },
        React.createElement(QRCodeSVG, {
          value: pairingUrl,
          size: 96,
          bgColor: '#ffffff',
          fgColor: '#0a0a0a',
          level: 'L',
        })
      ),
      React.createElement(
        'span',
        { className: 'input-bar-qr-label' },
        phoneConnected ? 'Phone ready' : 'Scan for keyboard'
      )
    ),

    // Center: compose preview
    React.createElement(
      'div',
      { className: 'input-bar-compose' },
      previewText
        ? React.createElement(
            'span',
            { className: 'input-bar-preview' },
            previewText,
            React.createElement('span', { className: 'input-bar-preview-cursor' }, '|')
          )
        : React.createElement(
            'span',
            { className: 'input-bar-placeholder' },
            isStreaming
              ? 'Claude is thinking…'
              : phoneConnected
              ? 'Typing on your phone…'
              : 'Open your phone companion to type'
          )
    ),

    // Right: Send button (usable with remote when phone has sent text)
    React.createElement(SendButton, { relay: relay, isStreaming: isStreaming })
  );
}

function SendButton(props) {
  var relay = props.relay;
  var isStreaming = props.isStreaming;

  var fp = useFocusable({
    focusKey: 'SEND_BTN',
    // Remote OK on this button does nothing — phone handles send
  });

  return React.createElement(
    'div',
    {
      ref: fp.ref,
      className: 'input-bar-send' +
        (isStreaming ? ' input-bar-send--busy' : '') +
        (fp.focused ? ' focused' : ''),
    },
    isStreaming
      ? React.createElement('span', { className: 'input-bar-spinner' }, '⟳')
      : '↑'
  );
}
