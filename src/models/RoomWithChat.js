// models/RoomWithChat.js
const Room = require('./Room');

class RoomWithChat extends Room {
  constructor(id, maxUsers = 10) {
    super(id, maxUsers);
    this.chatHistory = [];
  }

  addChatMessage(message) {
    if (this.chatHistory.length >= 100) {
      this.chatHistory.shift();
    }
    this.chatHistory.push(message);
  }

  getChatHistory() {
    return [...this.chatHistory];
  }
}

module.exports = RoomWithChat;