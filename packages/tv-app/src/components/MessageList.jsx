import React, { useEffect, useRef } from 'react';
import './MessageList.css';

export default function MessageList(props) {
  var messages = props.messages;
  var streamingText = props.streamingText;
  var isStreaming = props.isStreaming;
  var apiError = props.apiError;

  var bottomRef = useRef(null);

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
          ? React.createElement(
              'span',
              null,
              renderInlineText(streamingText),
              React.createElement('span', { className: 'message-cursor' }, '▊')
            )
          : React.createElement(ThinkingDots, null)
      )
    ),

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
      React.createElement(MarkdownText, { text: text })
    )
  );
}

// ─── Markdown renderer ────────────────────────────────────────────────────────

function MarkdownText(props) {
  var blocks = parseBlocks(props.text);
  return React.createElement(
    'div',
    { className: 'md' },
    blocks.map(renderBlock)
  );
}

function parseBlocks(text) {
  var blocks = [];
  var lines = text.split('\n');
  var i = 0;

  while (i < lines.length) {
    var line = lines[i];

    // Fenced code block
    if (line.startsWith('```')) {
      var lang = line.slice(3).trim();
      var codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      blocks.push({ type: 'code', lang: lang, text: codeLines.join('\n') });
      continue;
    }

    // Heading (# to ###)
    var hm = line.match(/^(#{1,3})\s+(.*)/);
    if (hm) {
      blocks.push({ type: 'heading', level: hm[1].length, text: hm[2] });
      i++;
      continue;
    }

    // Unordered list
    if (/^[\-\*\+]\s/.test(line)) {
      var items = [];
      while (i < lines.length && /^[\-\*\+]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[\-\*\+]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ul', items: items });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      var oitems = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        oitems.push(lines[i].replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ol', items: oitems });
      continue;
    }

    // Blank line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Paragraph — collect until blank line or block marker
    var paraLines = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].startsWith('```') &&
      !lines[i].match(/^#{1,3}\s/) &&
      !/^[\-\*\+]\s/.test(lines[i]) &&
      !/^\d+\.\s/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: 'p', text: paraLines.join('\n') });
    }
  }

  return blocks;
}

function renderBlock(block, index) {
  if (block.type === 'heading') {
    var tag = 'h' + block.level;
    return React.createElement(tag, { key: index, className: 'md-h' + block.level }, renderInlineText(block.text));
  }
  if (block.type === 'code') {
    return React.createElement(
      'pre',
      { key: index, className: 'md-pre' },
      React.createElement('code', null, block.text)
    );
  }
  if (block.type === 'ul') {
    return React.createElement(
      'ul',
      { key: index, className: 'md-ul' },
      block.items.map(function (item, j) {
        return React.createElement('li', { key: j, className: 'md-li' }, renderInlineText(item));
      })
    );
  }
  if (block.type === 'ol') {
    return React.createElement(
      'ol',
      { key: index, className: 'md-ol' },
      block.items.map(function (item, j) {
        return React.createElement('li', { key: j, className: 'md-li' }, renderInlineText(item));
      })
    );
  }
  // Paragraph
  return React.createElement('p', { key: index, className: 'md-p' }, renderInlineText(block.text));
}

function findInlineToken(text) {
  var patterns = [
    { re: /\*\*(.+?)\*\*/, tag: 'strong', cls: 'md-strong' },
    { re: /__(.+?)__/,     tag: 'strong', cls: 'md-strong' },
    { re: /\*(\S[^*\n]*?)\*/, tag: 'em', cls: 'md-em' },
    { re: /`([^`\n]+?)`/,  tag: 'code',   cls: 'md-ic' },
  ];

  var earliest = null;
  for (var i = 0; i < patterns.length; i++) {
    var m = patterns[i].re.exec(text);
    if (m && (!earliest || m.index < earliest.index)) {
      earliest = {
        index: m.index,
        fullLen: m[0].length,
        inner: m[1],
        tag: patterns[i].tag,
        cls: patterns[i].cls,
      };
    }
  }
  return earliest;
}

function renderInlineText(text) {
  if (!text) return [];

  var result = [];
  var remaining = text;
  var pos = 0;

  while (remaining.length > 0) {
    var token = findInlineToken(remaining);

    if (!token) {
      pushPlainText(remaining, result, pos);
      break;
    }

    if (token.index > 0) {
      pushPlainText(remaining.slice(0, token.index), result, pos);
    }

    result.push(React.createElement(token.tag, { key: 'f' + (pos + token.index), className: token.cls }, token.inner));
    pos += token.index + token.fullLen;
    remaining = remaining.slice(token.index + token.fullLen);
  }

  return result;
}

function pushPlainText(text, result, posOffset) {
  var parts = text.split('\n');
  for (var i = 0; i < parts.length; i++) {
    if (parts[i]) result.push(parts[i]);
    if (i < parts.length - 1) {
      result.push(React.createElement('br', { key: 'br' + (posOffset + i) }));
    }
  }
}

// ─── Thinking animation ───────────────────────────────────────────────────────

function ThinkingDots() {
  return React.createElement(
    'span',
    { className: 'thinking-dots' },
    React.createElement('span', null, '●'),
    React.createElement('span', null, '●'),
    React.createElement('span', null, '●')
  );
}
