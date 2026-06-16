import React, { useEffect, useRef } from 'react';
import './MessageList.css';

export default function MessageList(props) {
  var messages = props.messages;
  var streamingText = props.streamingText;
  var isStreaming = props.isStreaming;
  var apiError = props.apiError;

  var bottomRef = useRef(null);

  // Auto-scroll to bottom when new content arrives
  useEffect(function () {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingText]);

  var isEmpty = messages.length === 0 && !isStreaming;

  return React.createElement(
    'div',
    { className: 'message-list scrollable' },

    isEmpty && React.createElement(
      'div',
      { className: 'message-list-empty' },
      React.createElement('div', { className: 'message-list-empty-icon' }, '✦'),
      React.createElement('p', { className: 'message-list-empty-text' }, 'Use your phone to type a message'),
      React.createElement('p', { className: 'message-list-empty-sub' }, 'Scan the QR below, or use the TV remote')
    ),

    messages.map(function (msg, i) {
      return msg.role === 'user'
        ? React.createElement(UserMessage, { key: i, message: msg })
        : React.createElement(AssistantMessage, { key: i, message: msg });
    }),

    // Streaming bubble
    isStreaming && React.createElement(
      'div',
      { className: 'message-row message-row--assistant' },
      React.createElement(
        'div',
        { className: 'message-bubble message-bubble--assistant' },
        streamingText
          ? React.createElement('span', null, streamingText, React.createElement('span', { className: 'message-cursor' }, '▊'))
          : React.createElement(ThinkingDots, null)
      )
    ),

    // Error
    apiError && React.createElement(
      'div',
      { className: 'message-error' },
      React.createElement('span', { className: 'message-error-icon' }, '⚠ '),
      apiError
    ),

    React.createElement('div', { ref: bottomRef })
  );
}

function UserMessage(props) {
  var content = props.message.content;

  return React.createElement(
    'div',
    { className: 'message-row message-row--user' },
    React.createElement(
      'div',
      { className: 'message-bubble message-bubble--user' },
      content.map(function (block, i) {
        if (block.type === 'text') {
          return React.createElement('span', { key: i }, block.text);
        }
        if (block.type === 'image') {
          return React.createElement('img', {
            key: i,
            className: 'message-image',
            src: 'data:' + block.source.media_type + ';base64,' + block.source.data,
            alt: 'Attached image',
          });
        }
        return null;
      })
    )
  );
}

function AssistantMessage(props) {
  var content = props.message.content;
  var text = content.reduce(function (acc, b) { return b.type === 'text' ? acc + b.text : acc; }, '');

  return React.createElement(
    'div',
    { className: 'message-row message-row--assistant' },
    React.createElement(
      'div',
      { className: 'message-bubble message-bubble--assistant' },
      React.createElement(FormattedText, { text: text })
    )
  );
}

function FormattedText(props) {
  // Minimal markdown: split by newlines, render line breaks
  var lines = props.text.split('\n');
  return React.createElement(
    'span',
    null,
    lines.map(function (line, i) {
      return React.createElement(
        React.Fragment,
        { key: i },
        line,
        i < lines.length - 1 && React.createElement('br', null)
      );
    })
  );
}

function ThinkingDots() {
  return React.createElement(
    'span',
    { className: 'thinking-dots' },
    React.createElement('span', null, '●'),
    React.createElement('span', null, '●'),
    React.createElement('span', null, '●')
  );
}
