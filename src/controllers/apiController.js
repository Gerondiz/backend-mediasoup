// controllers/apiController.js
const roomService = require('../services/roomService');
const config = require('../config');
const logger = require('../utils/logger');

// Генерация ID комнаты
function generateRoomId() {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}

// Проверка здоровья сервера
function healthCheck(req, res) {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    rooms: roomService.getRooms().length,
    maxRooms: config.room.maxRooms,
    maxUsers: config.room.maxUsers,
    sessionTimeout: config.room.sessionTimeout
  });
}

// Создание комнаты
function createRoom(req, res) {
  try {
    const { username, password } = req.body;
    const roomId = generateRoomId();

    if (roomService.rooms.size >= config.room.maxRooms) {
      return res.status(400).json({
        success: false,
        message: `Maximum number of rooms reached (${config.room.maxRooms} max)`
      });
    }

    roomService.createRoom(roomId);

    res.json({
      success: true,
      roomId: roomId,
      message: 'Room created successfully'
    });
  } catch (error) {
    logger.error('Create room error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create room'
    });
  }
}

// Проверка возможности присоединения к комнате
function joinRoom(req, res) {
  try {
    const { roomId } = req.body;

    const room = roomService.getRoom(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    if (room.users.size >= room.maxUsers) {
      return res.status(400).json({
        success: false,
        message: `Room is full (${room.maxUsers} max users)`
      });
    }

    res.json({
      success: true,
      message: 'Room exists, you can join via WebSocket'
    });
  } catch (error) {
    logger.error('Join room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join room'
    });
  }
}

module.exports = {
  healthCheck,
  createRoom,
  joinRoom
};