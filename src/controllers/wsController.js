// controllers/wsController.js
const { createHandlerContext } = require('./handlers/connectionHandler');
const { setupMessageHandlers } = require('./handlers/messageHandler');
const logger = require('../utils/logger');

function handleWebSocketConnectionWrapper(ws, req) {
  logger.info('New WebSocket connection');
  
  // Создаем контекст и передаем ws
  const context = createHandlerContext(ws);
  
  // Проверяем, что контекст создан правильно
  if (!context || !context.ws) {
    logger.error('Failed to create handler context');
    ws.close();
    return;
  }
  
  // Настройка обработчиков сообщений
  setupMessageHandlers(context);
  
  // Настройка обработчиков событий соединения
  ws.on('close', () => {
    if (context.currentUser && context.currentRoom) {
      logger.info(`User ${context.currentUser.username} disconnected from room ${context.currentRoom.id}`);
      require('./handlers/roomHandler').handleUserDisconnect(context);
    } else {
      logger.info('WebSocket connection closed without joining a room');
    }
  });

  ws.on('error', (error) => {
    logger.error('WebSocket error:', error);
  });
}

module.exports = {
  handleWebSocketConnection: handleWebSocketConnectionWrapper
};