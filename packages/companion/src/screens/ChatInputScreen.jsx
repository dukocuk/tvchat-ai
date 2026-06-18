import React, { useState, useRef, useCallback } from 'react';
import '../App.css';
import './screens.css';

var MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB base64 budget (~3 MB raw)

export default function ChatInputScreen(props) {
  var relay = props.relay;
  var onAck = props.onAck;
  var modelState = props.modelState || { model: null, models: [] };

  function handleModelChange(e) {
    relay.send({ type: 'set_model', model: e.target.value });
  }

  var [text, setText] = useState('');
  var [sending, setSending] = useState(false);
  var [imagePending, setImagePending] = useState(null); // { base64, mimeType, previewUrl }
  var [imageLoading, setImageLoading] = useState(false);
  var [imageError, setImageError] = useState('');
  var textareaRef = useRef(null);

  // Send live preview as user types
  var handleTextChange = useCallback(function (e) {
    var val = e.target.value;
    setText(val);
    relay.send({ type: 'input_preview', text: val });
  }, [relay]);

  function handleSend() {
    if (sending) return;
    var trimmed = text.trim();
    if (!trimmed && !imagePending) return;

    setSending(true);

    if (imagePending) {
      relay.send({
        type: 'image_message',
        text: trimmed,
        base64: imagePending.base64,
        mimeType: imagePending.mimeType,
      });
    } else {
      relay.send({ type: 'chat_message', text: trimmed });
    }

    setText('');
    setImagePending(null);
    relay.send({ type: 'input_preview', text: '' });

    if (textareaRef.current) textareaRef.current.focus();

    setTimeout(function () { setSending(false); }, 1500);
    if (onAck) onAck();
  }

  function handleImagePick(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;

    setImageError('');
    setImageLoading(true);

    var reader = new FileReader();
    reader.onload = function (evt) {
      setImageLoading(false);
      var dataUrl = evt.target.result;
      var commaIdx = dataUrl.indexOf(',');
      var meta = dataUrl.slice(5, commaIdx); // "image/jpeg;base64"
      var mimeType = meta.split(';')[0];
      var base64 = dataUrl.slice(commaIdx + 1);

      if (base64.length > MAX_IMAGE_BYTES) {
        setImageError('Image too large — please choose one under 3 MB.');
        return;
      }

      setImagePending({ base64: base64, mimeType: mimeType, previewUrl: dataUrl });
    };
    reader.onerror = function () {
      setImageLoading(false);
      setImageError('Could not read the image. Please try another file.');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  var canSend = (text.trim() || imagePending) && !sending && !imageLoading;

  return React.createElement(
    'div',
    { className: 'chat-input-screen' },

    // Header
    React.createElement(
      'div',
      { className: 'chat-input-header' },
      React.createElement(
        'div',
        { className: 'logo' },
        'TVChat',
        React.createElement('span', null, ' AI')
      ),
      React.createElement(
        'div',
        { className: 'chat-input-status' },
        React.createElement('span', {
          className: 'status-dot status-dot--' + relay.status,
        }),
        relay.status === 'connected' ? 'TV connected' : relay.status
      )
    ),

    // Model selector — only once the TV has sent its model list
    modelState.models.length > 0 && React.createElement(
      'div',
      { className: 'chat-model-bar' },
      React.createElement('label', { className: 'chat-model-label', htmlFor: 'model-select' }, 'Model'),
      React.createElement(
        'select',
        {
          id: 'model-select',
          className: 'chat-model-select',
          value: modelState.model || '',
          onChange: handleModelChange,
        },
        modelState.models.map(function (m) {
          return React.createElement(
            'option',
            { key: m.id, value: m.id },
            m.badge ? m.label + ' · ' + m.badge : m.label
          );
        })
      )
    ),

    // Image error
    imageError && React.createElement(
      'div',
      { className: 'image-error' },
      imageError,
      React.createElement(
        'button',
        { className: 'image-error-dismiss', onClick: function () { setImageError(''); } },
        '✕'
      )
    ),

    // Image loading state
    imageLoading && React.createElement(
      'div',
      { className: 'image-loading' },
      'Processing image…'
    ),

    // Image preview
    imagePending && React.createElement(
      'div',
      { className: 'image-preview-wrap' },
      React.createElement('img', {
        className: 'image-preview',
        src: imagePending.previewUrl,
        alt: 'Selected image',
      }),
      React.createElement(
        'button',
        { className: 'image-remove', onClick: function () { setImagePending(null); } },
        '✕'
      )
    ),

    // Textarea
    React.createElement('textarea', {
      ref: textareaRef,
      className: 'chat-textarea',
      value: text,
      onChange: handleTextChange,
      placeholder: 'Type your message…',
      rows: 5,
      autoFocus: true,
    }),

    // Action bar
    React.createElement(
      'div',
      { className: 'chat-actions' },

      React.createElement(
        'label',
        { className: 'image-picker-label', title: 'Attach image' },
        React.createElement('input', {
          type: 'file',
          accept: 'image/*',
          style: { display: 'none' },
          onChange: handleImagePick,
        }),
        imageLoading ? '⟳' : '🖼'
      ),

      React.createElement(
        'button',
        {
          className: 'send-btn' + (canSend ? '' : ' send-btn--disabled'),
          onClick: handleSend,
          disabled: !canSend,
        },
        sending ? '⟳' : 'Send'
      )
    )
  );
}
