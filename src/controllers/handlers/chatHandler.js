// handlers/chatHandler.js
const logger = require('../../utils/logger');

function handleChatMessage(data, context) {
  const { currentRoom, currentUser } = context;

  if (!currentRoom || !currentUser) {
    logger.warn('Chat message received but user is not in a room');
    return;
  }

  // Создаем полное сообщение с метаданными
  const chatMessage = {
    id: Date.now().toString(),
    from: currentUser.username,
    text: data.text,
    timestamp: new Date().toISOString(),
  };

    // ✅ Сохраняем сообщение в истории комнаты
  if (currentRoom.addChatMessage) {
    currentRoom.addChatMessage(chatMessage);
  }

  logger.info(`💬 Chat message from ${currentUser.username}: ${data.text}`);

  // Рассылаем сообщение всем в комнате (включая отправителя)
  currentRoom.users.forEach(user => {
    try {
      user.socket.send(JSON.stringify({
        type: 'chat-message',
        data: { // ✅ Исправлено: используем data
          from: chatMessage.from,
          text: chatMessage.text,
          timestamp: chatMessage.timestamp
        }
      }));
    } catch (error) {
      logger.error('Error sending chat message to user:', error);
    }
  });
}

function handleGetChatHistory(context) {
  const { currentRoom, currentUser } = context;

  if (!currentRoom || !currentUser) {
    logger.warn('Get chat history received but user is not in a room');
    return;
  }

  if (currentRoom.getChatHistory) {
    const data = currentRoom.getChatHistory();
    currentUser.socket.send(JSON.stringify({
      type: 'chat-history',
       data
    }));
  }
}

module.exports = {
  handleChatMessage,
  handleGetChatHistory // ✅ Экспортируем
};