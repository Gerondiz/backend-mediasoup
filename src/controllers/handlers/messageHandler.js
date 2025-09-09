// handlers/messageHandler.js
const roomHandler = require('./roomHandler');
const transportHandler = require('./transportHandler');
const mediaHandler = require('./mediaHandler');
const chatHandler = require('./chatHandler');
const { validateMessage } = require('./connectionHandler');
const logger = require('../../utils/logger');

function setupMessageHandlers(context) {
  // Проверяем, что context и context.ws существуют
  if (!context || !context.ws) {
    logger.error('Invalid context or WebSocket in setupMessageHandlers');
    return;
  }
  
  const { ws } = context;
  
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);
      logger.info(`Received message type: ${message.type} from user: ${context.currentUser?.username || 'unknown'} with sessionId: ${message.data.sessionId}`);
      
      // Валидация сообщения
      let validatedData;
      try {
        validatedData = validateMessage(message, context);
      } catch (validationError) {
        context.sendError(validationError.message);
        return;
      }

      // Маршрутизация сообщений
      switch (message.type) {
        case 'join-room':
          await roomHandler.handleJoinRoom(validatedData, context);
          break;
        case 'leave-room':
          await roomHandler.handleLeaveRoom(context);
          break;
        case 'create-transport':
          await transportHandler.handleCreateTransport(validatedData, context);
          break;
        case 'connect-transport':
          await transportHandler.handleConnectTransport(validatedData, context);
          break;
        case 'produce':
          await mediaHandler.handleProduce(validatedData, context);
          break;
        case 'consume':
          await mediaHandler.handleConsume(validatedData, context);
          break;
        case 'get-producers':
          await mediaHandler.handleGetProducers(context);
          break;
        case 'chat-message':
          chatHandler.handleChatMessage(validatedData, context);
          break;
        default:
          logger.warn('Unknown message type:', message.type);
          context.sendError(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      logger.error('Error processing message:', error);
      context.sendError('Invalid message format');
    }
  });
}

module.exports = {
  setupMessageHandlers
};