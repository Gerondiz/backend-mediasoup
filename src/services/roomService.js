// services/roomService.js
const Room = require('../models/Room');
const RoomWithChat = require('../models/RoomWithChat');
const logger = require('../utils/logger');

class RoomService {
  constructor() {
    this.rooms = new Map();
    this.cleanupInterval = setInterval(() => this.cleanupRooms(), 5 * 60 * 1000);
  }

  createRoom(roomId, maxUsers = 10) {
    if (this.rooms.has(roomId)) {
      throw new Error('Room already exists');
    }

    const room = new RoomWithChat(roomId, maxUsers);
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
    const room = this.rooms.get(roomId);
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