// controllers/apiController.js
const roomService = require('../services/roomService');
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
    rooms: roomService.getRooms().length
  });
}

// Создание комнаты
function createRoom(req, res) {
  try {
    const { username, password } = req.body;
    const roomId = generateRoomId();
    
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
      message: 'Failed to create room'
    });
  }
}

// Проверка возможности присоединения к комнате
function joinRoom(req, res) {
  try {
    const { roomId } = req.body;
    
    if (!roomService.canJoinRoom(roomId)) {
      return res.status(404).json({
        success: false,
        message: 'Room not found or full'
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