// models/User.js
class User {
  constructor(id, username, socket, sessionId, rtpCapabilities = null) {
    this.id = id;
    this.username = username;
    this.socket = socket;
    this.sessionId = sessionId; // Добавляем sessionId
    this.joinedAt = new Date();
    this.lastActivity = Date.now();
    this.isConnected = true;
    this.lastDisconnected = null;
    this.transports = new Map();
    this.producers = new Map();
    this.consumers = new Map();
    this.rtpCapabilities = rtpCapabilities;
  }

  updateActivity() {
    this.lastActivity = Date.now();
  }

  toJSON() {
    return {
      id: this.id,
      username: this.username,
      sessionId: this.sessionId,
      joinedAt: this.joinedAt,
      isConnected: this.isConnected
    };
  }
}

module.exports = User;