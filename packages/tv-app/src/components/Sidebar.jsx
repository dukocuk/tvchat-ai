import React from 'react';
import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { useApp } from '../context/AppContext';
import './Sidebar.css';

export default function Sidebar(props) {
  var ctx = useApp();
  var state = ctx.state;
  var dispatch = ctx.dispatch;

  var fp = useFocusable({ focusKey: 'SIDEBAR' });

  return React.createElement(
    FocusContext.Provider,
    { value: fp.focusKey },
    React.createElement(
      'div',
      { className: 'sidebar', ref: fp.ref },

      // App logo
      React.createElement(
        'div',
        { className: 'sidebar-logo' },
        React.createElement('span', { className: 'sidebar-logo-text' }, 'clautv'),
        React.createElement('span', { className: 'sidebar-logo-ai' }, '-ai')
      ),

      // New chat button
      React.createElement(NewChatButton, { dispatch: dispatch }),

      // Conversation list
      React.createElement(
        'div',
        { className: 'sidebar-list scrollable' },
        state.conversations.slice().reverse().map(function (conv) {
          return React.createElement(ConversationItem, {
            key: conv.id,
            conv: conv,
            active: state.activeConversation && state.activeConversation.id === conv.id,
            dispatch: dispatch,
          });
        })
      ),

      // Connection status indicator
      React.createElement(
        'div',
        { className: 'sidebar-relay-status' },
        React.createElement('span', {
          className: 'sidebar-relay-dot sidebar-relay-dot--' + props.relay.status,
        }),
        React.createElement(
          'span',
          { className: 'sidebar-relay-label' },
          props.relay.status === 'peer_connected' ? 'Phone connected' : 'Relay'
        )
      )
    )
  );
}

function NewChatButton(props) {
  var fp = useFocusable({
    focusKey: 'NEW_CHAT',
    onEnterPress: function () { props.dispatch({ type: 'CONVERSATION_NEW' }); },
  });

  return React.createElement(
    'button',
    {
      ref: fp.ref,
      className: 'sidebar-new-btn' + (fp.focused ? ' focused' : ''),
      onClick: function () { props.dispatch({ type: 'CONVERSATION_NEW' }); },
    },
    '+ New Chat'
  );
}

function ConversationItem(props) {
  var conv = props.conv;
  var active = props.active;
  var dispatch = props.dispatch;

  var fp = useFocusable({
    focusKey: 'CONV_' + conv.id,
    onEnterPress: function () { dispatch({ type: 'CONVERSATION_SELECT', id: conv.id }); },
  });

  return React.createElement(
    'button',
    {
      ref: fp.ref,
      className: 'sidebar-conv-item' +
        (active ? ' sidebar-conv-item--active' : '') +
        (fp.focused ? ' focused' : ''),
      onClick: function () { dispatch({ type: 'CONVERSATION_SELECT', id: conv.id }); },
    },
    React.createElement('span', { className: 'sidebar-conv-title' }, conv.title || 'New conversation'),
    React.createElement(
      'span',
      { className: 'sidebar-conv-count' },
      conv.messages.length + ' msg' + (conv.messages.length !== 1 ? 's' : '')
    )
  );
}
