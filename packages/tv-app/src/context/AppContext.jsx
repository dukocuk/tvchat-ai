import React, { createContext, useContext, useReducer, useEffect } from 'react';
import {
  getApiKey, setApiKey, clearApiKey,
  getModel, setModel,
  getConversations, saveConversations,
  getActiveConversationId, setActiveConversationId,
} from '../utils/storage';
import { createConversation, addMessage, toApiMessages } from '../utils/conversations';
import { generateToken } from '../utils/token';

var AppContext = createContext(null);

var MODELS = [
  { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5', badge: 'Fast' },
  { id: 'claude-sonnet-4-6',         label: 'Sonnet 4.6', badge: 'Balanced' },
  { id: 'claude-opus-4-8',           label: 'Opus 4.8',   badge: 'Powerful' },
];

function getInitialState() {
  var conversations = getConversations();
  var activeId = getActiveConversationId();
  var active = conversations.find(function (c) { return c.id === activeId; }) || null;

  return {
    screen: getApiKey() ? 'chat' : 'setup',
    apiKey: getApiKey(),
    model: getModel(),
    conversations: conversations,
    activeConversation: active,
    streamingText: '',
    isStreaming: false,
    apiError: null,
    settingsOpen: false,
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'API_KEY_SET': {
      setApiKey(action.key);
      return Object.assign({}, state, { apiKey: action.key, screen: 'chat', apiError: null });
    }
    case 'API_KEY_RESET': {
      clearApiKey();
      return Object.assign({}, state, {
        apiKey: null,
        screen: 'setup',
        conversations: state.conversations,
        activeConversation: null,
        settingsOpen: false,
      });
    }
    case 'MODEL_SET': {
      setModel(action.model);
      return Object.assign({}, state, { model: action.model });
    }
    case 'CONVERSATION_NEW': {
      var newConv = createConversation('');
      var updatedList = state.conversations.concat([newConv]);
      saveConversations(updatedList);
      setActiveConversationId(newConv.id);
      return Object.assign({}, state, {
        conversations: updatedList,
        activeConversation: newConv,
        streamingText: '',
        apiError: null,
      });
    }
    case 'CONVERSATION_SELECT': {
      var found = state.conversations.find(function (c) { return c.id === action.id; });
      if (!found) return state;
      setActiveConversationId(found.id);
      return Object.assign({}, state, { activeConversation: found, streamingText: '', apiError: null });
    }
    case 'MESSAGE_USER_ADD': {
      if (!state.activeConversation) return state;
      var updated = addMessage(state.activeConversation, 'user', action.content);
      // Update title from first real text message
      if (state.activeConversation.messages.length === 0) {
        var firstText = action.content.find(function (b) { return b.type === 'text'; });
        if (firstText) {
          updated = Object.assign({}, updated, { title: firstText.text.slice(0, 60) });
        }
      }
      var newList = state.conversations.map(function (c) { return c.id === updated.id ? updated : c; });
      saveConversations(newList);
      setActiveConversationId(updated.id);
      return Object.assign({}, state, { conversations: newList, activeConversation: updated, isStreaming: true, streamingText: '', apiError: null });
    }
    case 'STREAM_TOKEN': {
      return Object.assign({}, state, { streamingText: state.streamingText + action.text });
    }
    case 'STREAM_DONE': {
      if (!state.activeConversation) return Object.assign({}, state, { isStreaming: false, streamingText: '' });
      var assistantConv = addMessage(state.activeConversation, 'assistant', [
        { type: 'text', text: state.streamingText },
      ]);
      var finalList = state.conversations.map(function (c) { return c.id === assistantConv.id ? assistantConv : c; });
      saveConversations(finalList);
      return Object.assign({}, state, {
        conversations: finalList,
        activeConversation: assistantConv,
        isStreaming: false,
        streamingText: '',
      });
    }
    case 'API_ERROR': {
      return Object.assign({}, state, { isStreaming: false, streamingText: '', apiError: action.message });
    }
    case 'SETTINGS_OPEN':  return Object.assign({}, state, { settingsOpen: true });
    case 'SETTINGS_CLOSE': return Object.assign({}, state, { settingsOpen: false });
    default: return state;
  }
}

export function AppProvider(props) {
  var pair = useReducer(reducer, null, getInitialState);
  var state = pair[0];
  var dispatch = pair[1];

  // Ensure there's always an active conversation when on chat screen
  useEffect(function () {
    if (state.screen === 'chat' && !state.activeConversation) {
      if (state.conversations.length > 0) {
        dispatch({ type: 'CONVERSATION_SELECT', id: state.conversations[state.conversations.length - 1].id });
      } else {
        dispatch({ type: 'CONVERSATION_NEW' });
      }
    }
  }, [state.screen, state.activeConversation, state.conversations]);

  return React.createElement(
    AppContext.Provider,
    { value: { state: state, dispatch: dispatch, MODELS: MODELS } },
    props.children
  );
}

export function useApp() {
  return useContext(AppContext);
}
