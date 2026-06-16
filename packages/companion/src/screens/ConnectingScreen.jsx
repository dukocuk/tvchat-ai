import React from 'react';
import '../App.css';
import './screens.css';

export default function ConnectingScreen() {
  return React.createElement(
    'div',
    { className: 'screen' },
    React.createElement(
      'div',
      { className: 'connecting-spinner' },
      '◌'
    ),
    React.createElement('p', { className: 'connecting-text' }, 'Connecting to TV…')
  );
}
