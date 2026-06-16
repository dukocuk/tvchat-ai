import React, { useEffect } from 'react';
import { useFocusable, FocusContext, setFocus } from '@noriginmedia/norigin-spatial-navigation';
import { useApp } from '../context/AppContext';
import './SettingsPanel.css';

export default function SettingsPanel() {
  var ctx = useApp();
  var state = ctx.state;
  var dispatch = ctx.dispatch;

  var fp = useFocusable({ focusKey: 'SETTINGS_PANEL', isFocusBoundary: true, autoRestoreFocus: true });

  useEffect(function () {
    setFocus('SETTINGS_CLOSE_BTN');
  }, []);

  function close() { dispatch({ type: 'SETTINGS_CLOSE' }); }
  function resetKey() { dispatch({ type: 'API_KEY_RESET' }); }

  return React.createElement(
    FocusContext.Provider,
    { value: fp.focusKey },
    React.createElement(
      'div',
      { className: 'settings-overlay', onClick: close },
      React.createElement(
        'div',
        { className: 'settings-panel', ref: fp.ref, onClick: function (e) { e.stopPropagation(); } },

        React.createElement('h2', { className: 'settings-heading' }, 'Settings'),

        // Model selector
        React.createElement('div', { className: 'settings-section-label' }, 'Claude Model'),
        React.createElement(
          'div',
          { className: 'settings-model-list' },
          ctx.MODELS.map(function (m) {
            return React.createElement(ModelOption, {
              key: m.id,
              model: m,
              active: state.model === m.id,
              dispatch: dispatch,
            });
          })
        ),

        // System prompt presets
        React.createElement('div', { className: 'settings-divider' }),
        React.createElement('div', { className: 'settings-section-label' }, 'Persona'),
        React.createElement(
          'div',
          { className: 'settings-model-list' },
          ctx.SYSTEM_PROMPT_PRESETS.map(function (p) {
            return React.createElement(PresetOption, {
              key: p.label,
              preset: p,
              active: state.systemPrompt === p.prompt,
              dispatch: dispatch,
            });
          })
        ),

        // Reset API key
        React.createElement('div', { className: 'settings-divider' }),
        React.createElement(ResetKeyButton, { onReset: resetKey }),

        // Close
        React.createElement('div', { className: 'settings-divider' }),
        React.createElement(CloseButton, { onClose: close })
      )
    )
  );
}

function ModelOption(props) {
  var m = props.model;
  var active = props.active;
  var dispatch = props.dispatch;

  var fp = useFocusable({
    focusKey: 'MODEL_' + m.id,
    onEnterPress: function () { dispatch({ type: 'MODEL_SET', model: m.id }); },
  });

  return React.createElement(
    'button',
    {
      ref: fp.ref,
      className: 'settings-model-option' +
        (active ? ' settings-model-option--active' : '') +
        (fp.focused ? ' focused' : ''),
      onClick: function () { dispatch({ type: 'MODEL_SET', model: m.id }); },
    },
    React.createElement('span', { className: 'settings-model-name' }, m.label),
    React.createElement('span', { className: 'settings-model-badge' }, m.badge),
    active && React.createElement('span', { className: 'settings-model-check' }, '✓')
  );
}

function PresetOption(props) {
  var p = props.preset;
  var active = props.active;
  var dispatch = props.dispatch;

  var fp = useFocusable({
    focusKey: 'PRESET_' + p.label,
    onEnterPress: function () { dispatch({ type: 'SYSTEM_PROMPT_SET', prompt: p.prompt }); },
  });

  return React.createElement(
    'button',
    {
      ref: fp.ref,
      className: 'settings-model-option' +
        (active ? ' settings-model-option--active' : '') +
        (fp.focused ? ' focused' : ''),
      onClick: function () { dispatch({ type: 'SYSTEM_PROMPT_SET', prompt: p.prompt }); },
    },
    React.createElement('span', { className: 'settings-model-name' }, p.label),
    p.badge && React.createElement('span', { className: 'settings-model-badge' }, p.badge),
    active && React.createElement('span', { className: 'settings-model-check' }, '✓')
  );
}

function ResetKeyButton(props) {
  var fp = useFocusable({
    focusKey: 'SETTINGS_RESET_KEY',
    onEnterPress: props.onReset,
  });

  return React.createElement(
    'button',
    {
      ref: fp.ref,
      className: 'settings-btn settings-btn--danger' + (fp.focused ? ' focused' : ''),
      onClick: props.onReset,
    },
    'Reset API Key'
  );
}

function CloseButton(props) {
  var fp = useFocusable({
    focusKey: 'SETTINGS_CLOSE_BTN',
    onEnterPress: props.onClose,
  });

  return React.createElement(
    'button',
    {
      ref: fp.ref,
      className: 'settings-btn' + (fp.focused ? ' focused' : ''),
      onClick: props.onClose,
    },
    'Close'
  );
}
