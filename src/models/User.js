// models/User.js
class User {
  constructor(id, username, socket) {
    this.id = id;
    this.username = username;
    this.socket = socket;
    this.joinedAt = new Date();
    this.transports = new Map();
    this.producers = new Map();
    this.consumers = new Map();
    this.rtpCapabilities = null;
    this.lastActivity = Date.now();
  }

  updateActivity() {
    this.lastActivity = Date.now();
  }

  toJSON() {
    return {
      id: this.id,
      username: this.username,
      joinedAt: this.joinedAt
    };
  }
}

module.exports = User;