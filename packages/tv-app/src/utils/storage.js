var PREFIX = 'clautv_';
var MAX_CONVERSATIONS = 20;

export function getApiKey() {
  try {
    return localStorage.getItem(PREFIX + 'api_key') || null;
  } catch (e) {
    return null;
  }
}

export function setApiKey(key) {
  try {
    localStorage.setItem(PREFIX + 'api_key', key);
  } catch (e) {}
}

export function clearApiKey() {
  try {
    localStorage.removeItem(PREFIX + 'api_key');
  } catch (e) {}
}

export function getModel() {
  try {
    return localStorage.getItem(PREFIX + 'model') || 'claude-sonnet-4-6';
  } catch (e) {
    return 'claude-sonnet-4-6';
  }
}

export function setModel(model) {
  try {
    localStorage.setItem(PREFIX + 'model', model);
  } catch (e) {}
}

export function getConversations() {
  try {
    var raw = localStorage.getItem(PREFIX + 'conversations');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveConversations(conversations) {
  try {
    // Keep only the most recent MAX_CONVERSATIONS to stay under 5MB
    var toSave = conversations.slice(-MAX_CONVERSATIONS);
    localStorage.setItem(PREFIX + 'conversations', JSON.stringify(toSave));
  } catch (e) {
    // If storage is full, drop the oldest conversation and retry
    try {
      var trimmed = conversations.slice(-Math.floor(MAX_CONVERSATIONS / 2));
      localStorage.setItem(PREFIX + 'conversations', JSON.stringify(trimmed));
    } catch (e2) {}
  }
}

export function getActiveConversationId() {
  try {
    return localStorage.getItem(PREFIX + 'active_id') || null;
  } catch (e) {
    return null;
  }
}

export function setActiveConversationId(id) {
  try {
    if (id) {
      localStorage.setItem(PREFIX + 'active_id', id);
    } else {
      localStorage.removeItem(PREFIX + 'active_id');
    }
  } catch (e) {}
}
