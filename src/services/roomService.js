// services/roomService.js
const RoomWithChat = require('../models/RoomWithChat');
const config = require('../config');
const logger = require('../utils/logger');

class RoomService {
  constructor() {
    this.rooms = new Map();
    this.cleanupInterval = setInterval(() => this.cleanupRooms(), 5 * 60 * 1000);
  }

  createRoom(roomId) {
    // ✅ Проверяем лимит комнат
    if (this.rooms.size >= config.room.maxRooms) {
      throw new Error('Maximum number of rooms reached');
    }

    if (this.rooms.has(roomId)) {
      throw new Error('Room already exists');
    }

    // ✅ Используем maxUsers из config
    const room = new RoomWithChat(roomId, config.room.maxUsers);
    this.rooms.set(roomId, room);
    logger.info(`Room created: ${roomId}`);
    
    return room;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  deleteRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (room) {
      if (room.router) {
        room.router.close();
      }
      this.rooms.delete(roomId);
      logger.info(`Room deleted: ${roomId}`);
    }
  }

  canJoinRoom(roomId) {
    const room = this.getRoom(roomId);
    return room && room.users.size < room.maxUsers;
  }

  cleanupRooms() {
    const now = Date.now();
    let deletedCount = 0;

    for (const [roomId, room] of this.rooms.entries()) {
      if (room.isEmpty()) {
        this.deleteRoom(roomId);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      logger.info(`Cleaned ${deletedCount} inactive rooms`);
    }
  }

  getRooms() {
    return Array.from(this.rooms.values()).map(room => room.toJSON());
  }
}

module.exports = new RoomService();