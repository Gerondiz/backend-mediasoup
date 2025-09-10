// models/RoomWithChat.js
const Room = require('./Room');

class RoomWithChat extends Room {
  constructor(id, maxUsers = 10) {
    super(id, maxUsers);
    this.chatHistory = []; // ✅ История чата
  }

  addChatMessage(message) {
    // Ограничиваем историю последними 100 сообщениями
    if (this.chatHistory.length >= 100) {
      this.chatHistory.shift();
    }
    this.chatHistory.push(message);
  }

  getChatHistory() {
    return [...this.chatHistory]; // Возвращаем копию
  }
}

module.exports = RoomWithChat;