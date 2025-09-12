// handlers/connectionHandler.js
const logger = require('../../utils/logger');
const validators = require('../validators');

function createHandlerContext(ws) {
  let currentUser = null;
  let currentRoom = null;
  
  const sendError = (message) => {
    ws.send(JSON.stringify({
      type: 'error',
      data: { message }
    }));
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
        } catch (error) {
          logger.error('Error sending message to user:', error);
        }
      }
    });
  };

  return {
    ws,
    get currentUser() { return currentUser; },
    set currentUser(user) { currentUser = user; },
    get currentRoom() { return currentRoom; },
    set currentRoom(room) { currentRoom = room; },
    sendError,
    sendToClient,
    broadcastToRoom,
    validators
  };
}

function validateMessage(message, context) {
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