import { generateToken } from './token';

export function createConversation(firstUserText) {
  return {
    id: generateToken(12),
    title: (firstUserText || 'New conversation').slice(0, 60),
    createdAt: Date.now(),
    messages: [],
  };
}

export function addMessage(conversation, role, contentBlocks) {
  return {
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt,
    messages: conversation.messages.concat([
      {
        role: role,
        content: contentBlocks,
        timestamp: Date.now(),
      },
    ]),
  };
}

// Returns the messages array in the shape the Anthropic API expects
export function toApiMessages(conversation) {
  return conversation.messages.map(function (msg) {
    return { role: msg.role, content: msg.content };
  });
}
