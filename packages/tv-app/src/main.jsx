import React from 'react';
import ReactDOM from 'react-dom/client';
import { init } from '@noriginmedia/norigin-spatial-navigation';
import { AppProvider } from './context/AppContext';
import App from './App';
import './index.css';

init({ debug: false, visualDebug: false });

// Register Tizen back key so the browser doesn't intercept it
try {
  if (window.tizen) {
    tizen.tvinputdevice.registerKey('Back');
  }
} catch (e) {}

ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(AppProvider, null, React.createElement(App, null))
);
