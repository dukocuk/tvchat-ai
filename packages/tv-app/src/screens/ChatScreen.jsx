import React, { useEffect } from 'react';
import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { useApp } from '../context/AppContext';
import Sidebar from '../components/Sidebar';
import MessageList from '../components/MessageList';
import InputBar from '../components/InputBar';
import './ChatScreen.css';

export default function ChatScreen(props) {
  var relay = props.relay;
  var previewText = props.previewText;
  var ctx = useApp();
  var state = ctx.state;
  var dispatch = ctx.dispatch;

  useEffect(function () {
    relay.send({ type: 'context', value: 'chat' });
  }, []);

  // Root focusable container
  var focusPair = useFocusable({ focusKey: 'CHAT_ROOT', isFocusBoundary: true });
  var ref = focusPair.ref;
  var focusKey = focusPair.focusKey;

  // Handle Back key to open settings
  useEffect(function () {
    function onKey(e) {
      // Tizen Back = 10009, also check Escape for dev
      if (e.keyCode === 10009 || e.keyCode === 27) {
        if (state.settingsOpen) {
          dispatch({ type: 'SETTINGS_CLOSE' });
        } else {
          dispatch({ type: 'SETTINGS_OPEN' });
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return function () { window.removeEventListener('keydown', onKey); };
  }, [state.settingsOpen, dispatch]);

  var activeConv = state.activeConversation;
  var messages = activeConv ? activeConv.messages : [];

  return React.createElement(
    FocusContext.Provider,
    { value: focusKey },
    React.createElement(
      'div',
      { className: 'chat-screen', ref: ref },

      React.createElement(Sidebar, { relay: relay }),

      React.createElement(
        'div',
        { className: 'chat-main' },

        // Top bar
        React.createElement(
          'div',
          { className: 'chat-topbar' },
          React.createElement(
            'span',
            { className: 'chat-title' },
            activeConv ? activeConv.title || 'New conversation' : 'New conversation'
          ),
          React.createElement(
            TopBarButtons,
            { dispatch: dispatch, model: state.model }
          )
        ),

        // Message area
        React.createElement(MessageList, {
          messages: messages,
          streamingText: state.streamingText,
          isStreaming: state.isStreaming,
          apiError: state.apiError,
        }),

        React.createElement(InputBar, {
          relay: relay,
          previewText: previewText || '',
          isStreaming: state.isStreaming,
        })
      )
    )
  );
}

function TopBarButtons(props) {
  var dispatch = props.dispatch;
  var model = props.model;

  var fp = useFocusable({
    focusKey: 'SETTINGS_BTN',
    onEnterPress: function () { dispatch({ type: 'SETTINGS_OPEN' }); },
  });

  var modelLabel = {
    'claude-haiku-4-5-20251001': 'Haiku',
    'claude-sonnet-4-6': 'Sonnet',
    'claude-opus-4-8': 'Opus',
  }[model] || model;

  return React.createElement(
    'div',
    { className: 'chat-topbar-right' },
    React.createElement('span', { className: 'chat-model-badge' }, modelLabel),
    React.createElement(
      'button',
      {
        ref: fp.ref,
        className: 'chat-settings-btn' + (fp.focused ? ' focused' : ''),
        onClick: function () { dispatch({ type: 'SETTINGS_OPEN' }); },
      },
      '⚙'
    )
  );
}
