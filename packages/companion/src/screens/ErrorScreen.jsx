import React from 'react';
import '../App.css';
import './screens.css';

export default function ErrorScreen(props) {
  return React.createElement(
    'div',
    { className: 'screen' },
    React.createElement('div', { className: 'error-icon' }, '⚠'),
    React.createElement('p', { className: 'error-message' }, props.message || 'Something went wrong.')
  );
}
