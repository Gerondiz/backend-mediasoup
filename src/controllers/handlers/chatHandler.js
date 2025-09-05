function handleChatMessage(data, context) {
  const { text } = data;
  const { currentRoom, currentUser, sendError, broadcastToRoom } = context;
  
  if (!currentRoom || !currentUser) {
    sendError('Not joined to any room');
    return;
  }
  
  // Пересылаем сообщение всем участникам комнаты
  broadcastToRoom('chat-message', {
    from: currentUser.username,
    text,
    timestamp: new Date().toISOString()
  }, false); // false = включая отправителя
}

module.exports = {
  handleChatMessage
};