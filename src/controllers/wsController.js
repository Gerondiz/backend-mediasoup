// controllers/wsController.js
const { createHandlerContext } = require('./handlers/connectionHandler');
const { setupMessageHandlers } = require('./handlers/messageHandler');
const logger = require('../utils/logger');

// --- Добавлено для Heartbeat ---
const HEARTBEAT_INTERVAL = 25000; // 25 секунд
const TIMEOUT_DURATION = 45000;   // 45 секунд (должно быть больше HEARTBEAT_INTERVAL)

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

  // --- Добавлено для Heartbeat ---
  // Инициализируем время последней активности
  ws.isAlive = true;
  ws.lastPongReceived = Date.now();

  // Установка обработчиков Ping/Pong
  // Обработчик Ping от клиента (автоматический pong отправляется библиотекой ws)
  ws.on('ping', (data) => {
    logger.debug(`Received ping from user: ${context.currentUser?.username || 'unknown'}`);
    // isAlive уже установлен в true библиотекой, но можно добавить логику
    ws.isAlive = true;
    // Обновляем время последней активности
    ws.lastPongReceived = Date.now();
  });

  // Обработчик Pong от клиента
  ws.on('pong', () => {
    logger.debug(`Received pong from user: ${context.currentUser?.username || 'unknown'}`);
    ws.isAlive = true;
    ws.lastPongReceived = Date.now();
  });

  // --- Конец Heartbeat ---

  // Настройка обработчиков сообщений
  setupMessageHandlers(context);

  // --- Добавлено для Heartbeat ---
  // Функция для отправки ping
  const sendPing = () => {
    if (ws.readyState === ws.OPEN) {
      // Проверяем, не истекло ли время с последнего pong
      const timeSinceLastPong = Date.now() - ws.lastPongReceived;
      if (timeSinceLastPong > TIMEOUT_DURATION) {
        logger.warn(`WebSocket timeout for user: ${context.currentUser?.username || 'unknown'}. Disconnecting.`);
        ws.terminate(); // Принудительно закрываем соединение
        return;
      }
      // Отправляем ping
      ws.ping(); // Отправляем пустой ping фрейм
      logger.debug(`Sent ping to user: ${context.currentUser?.username || 'unknown'}`);
    }
  };

  // Запускаем интервал для отправки ping
  const pingInterval = setInterval(sendPing, HEARTBEAT_INTERVAL);

  // Обработка закрытия соединения
  const handleClose = () => {
    logger.info(`WebSocket connection closed for user: ${context.currentUser?.username || 'unknown'}`);
    clearInterval(pingInterval); // Очищаем интервал

    if (context.currentUser && context.currentRoom) {
      logger.info(`User ${context.currentUser.username} disconnected from room ${context.currentRoom.id}`);
      require('./handlers/roomHandler').handleUserDisconnect(context);
    } else {
      logger.info('WebSocket connection closed without joining a room');
    }
  };

  ws.on('close', handleClose);

  // Обработка ошибок
  ws.on('error', (error) => {
    logger.error('WebSocket error:', error);
    // Ошибки могут привести к нестабильному состоянию, лучше закрыть соединение
    // handleClose будет вызван автоматически после ws.close() или ws.terminate()
    ws.close(1011, 'Internal error'); // 1011 - Internal Error
  });
  // --- Конец Heartbeat ---
}

module.exports = {
  handleWebSocketConnection: handleWebSocketConnectionWrapper
};