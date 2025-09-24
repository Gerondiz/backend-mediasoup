// handlers/connectionHandler.js
const logger = require('../../utils/logger');
const validators = require('../validators');

function createHandlerContext(ws) {
  let currentUser = null;
  let currentRoom = null;

  // --- Добавлено для Heartbeat ---
  // Ссылка на интервал пингов (будет заполнена в wsController)
  let pingInterval = null;
  // --- Конец Heartbeat ---

  const sendError = (message) => {
    ws.send(JSON.stringify({ type: 'error', data: { message } }));
  };

  const sendToClient = (type, data) => {
    ws.send(JSON.stringify({ type, data }));
  };

  const broadcastToRoom = (type, data, excludeSelf = true) => {
    if (!currentRoom) return;
    currentRoom.users.forEach(user => {
      if (user.socket !== ws || !excludeSelf) {
        try {
          user.socket.send(JSON.stringify({ type, data }));
        } catch (err) {
          logger.error('Error broadcasting to user:', err);
          // Можем попробовать отключить "мертвого" пользователя здесь
          // Но основная логика отключения должна оставаться в wsController
        }
      }
    });
  };

  const context = {
    ws,
    currentUser,
    currentRoom,
    // --- Добавлено для Heartbeat ---
    pingInterval, // Добавляем в контекст
    // --- Конец Heartbeat ---
    sendError,
    sendToClient,
    broadcastToRoom,
    validators
  };

  // Геттеры и сеттеры для currentUser и currentRoom
  Object.defineProperty(context, 'currentUser', {
    get() { return currentUser; },
    set(user) { currentUser = user; }
  });

  Object.defineProperty(context, 'currentRoom', {
    get() { return currentRoom; },
    set(room) { currentRoom = room; }
  });

  // --- Добавлено для Heartbeat ---
  // Геттер и сеттер для pingInterval
  Object.defineProperty(context, 'pingInterval', {
    get() { return pingInterval; },
    set(interval) { pingInterval = interval; }
  });
  // --- Конец Heartbeat ---

  return context;
}

function validateMessage(message, context) {
  if (!message || typeof message !== 'object') {
    throw new Error('Invalid message format');
  }
  if (!message.type || typeof message.type !== 'string') {
    throw new Error('Message type is required');
  }
  if (!context.validators[message.type]) {
    throw new Error(`Unknown message type: ${message.type}`);
  }
  return context.validators[message.type](message.data);
}

module.exports = {
  createHandlerContext,
  validateMessage
};