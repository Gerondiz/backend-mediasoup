// models/Room.js
const User = require('./User');

class Room {
  constructor(id, maxUsers = 10) {
    this.id = id;
    this.maxUsers = maxUsers;
    this.users = new Map();
    this.createdAt = new Date();
    this.router = null;
    this.transports = new Map();
    this.producers = new Map();
    this.consumers = new Map();
  }

  addUser(user) {
    if (this.users.size >= this.maxUsers) {
      throw new Error('Room is full');
    }

    this.users.set(user.id, user);
    return true;
  }

  removeUser(userId) {
    return this.users.delete(userId);
  }

  getUser(userId) {
    return this.users.get(userId);
  }

  getUserBySessionId(sessionId) {
    for (const user of this.users.values()) {
      if (user.sessionId === sessionId) {
        return user;
      }
    }
    return null;
  }

  getUsersList() {
    return Array.from(this.users.values()).map(user => ({
      id: user.id,
      username: user.username,
      sessionId: user.sessionId,
      joinedAt: user.joinedAt.toISOString(),
      isConnected: user.isConnected
    }));
  }

  isEmpty() {
    return this.users.size === 0;
  }

  toJSON() {
    return {
      id: this.id,
      userCount: this.users.size,
      maxUsers: this.maxUsers,
      createdAt: this.createdAt
    };
  }
}

module.exports = Room;