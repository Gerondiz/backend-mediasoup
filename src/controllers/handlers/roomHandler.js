const roomService = require('../../services/roomService');
const mediasoupService = require('../../services/mediasoupService');
const User = require('../../models/User');
const logger = require('../../utils/logger');

async function handleJoinRoom(data, context) {
  const { roomId, username, sessionId } = data;
  const { sendError, sendToClient, broadcastToRoom } = context;
  
  try {
    // Получаем или создаем комнату
    let room = roomService.getRoom(roomId);
    if (!room) {
      room = roomService.createRoom(roomId);
    }

    // Проверяем возможность присоединения
    if (!roomService.canJoinRoom(roomId)) {
      sendError('Room is full');
      return;
    }

    // Создаем маршрутизатор если его нет
    if (!room.router) {
      room.router = await mediasoupService.createRouter();
      logger.info(`Router created for room: ${roomId}`);
    }

    // Проверяем, есть ли пользователь с таким sessionId
    let user = room.getUserBySessionId(sessionId);
    
    if (user) {
      // Обновляем существующего пользователя
      user.socket = context.ws;
      user.isConnected = true;
      user.lastActivity = Date.now();
      
      // Уведомляем других участников о переподключении
      broadcastToRoom('user-connection-status', {
        userId: user.id,
        isConnected: true
      });
    } else {
      // Создаем нового пользователя
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      user = new User(userId, username, context.ws, sessionId);
      room.addUser(user);
      
      // Уведомляем других участников о новом пользователе
      broadcastToRoom('user-joined', {
        user: user.toJSON()
      });
    }

    context.currentUser = user;
    context.currentRoom = room;

    // Отправляем подтверждение присоединения
    sendToClient('joined', {
      roomId,
      users: room.getUsersList(),
      sessionId: user.sessionId
    });

    // Обновляем список пользователей у всех участников
    broadcastToRoom('users-updated', {
      users: room.getUsersList()
    });

    logger.info(`User ${username} joined room ${roomId}`);
  } catch (error) {
    logger.error('Join room error:', error);
    sendError(error.message);
  }
}

async function handleLeaveRoom(context) {
  const { currentUser, currentRoom } = context;
  
  if (currentRoom && currentUser) {
    logger.info(`User ${currentUser.username} left room ${currentRoom.id} (intentional leave)`);
    handleUserDisconnect(context);
  }
}

function handleUserDisconnect(context) {
  const { currentUser, currentRoom, broadcastToRoom } = context;
  
  if (!currentRoom || !currentUser) return;

  // Обновляем статус подключения пользователя
  currentUser.isConnected = false;
  currentUser.lastDisconnected = Date.now();
  
  // Уведомляем других участников об отключении
  broadcastToRoom('user-connection-status', {
    userId: currentUser.id,
    isConnected: false
  });

  // Удаляем пользователя из комнаты
  currentRoom.removeUser(currentUser.id);

  // Закрываем все транспорты пользователя
  currentUser.transports.forEach(({ transport }) => {
    transport.close();
  });

  // Закрываем все производители пользователя
  currentUser.producers.forEach(producer => {
    producer.close();
  });

  // Закрываем все потребители пользователя
  currentUser.consumers.forEach(consumer => {
    consumer.close();
  });

  // Уведомляем других участников о выходе пользователя
  broadcastToRoom('user-left', {
    userId: currentUser.id,
    username: currentUser.username
  });

  // Обновляем список пользователей у всех участников
  broadcastToRoom('users-updated', {
    users: currentRoom.getUsersList()
  });

  logger.info(`User ${currentUser.username} left room ${currentRoom.id}`);

  // Если комната пуста, удаляем ее
  if (currentRoom.isEmpty()) {
    roomService.deleteRoom(currentRoom.id);
    logger.info(`Room ${currentRoom.id} deleted (empty)`);
  }

  // Сбрасываем текущие ссылки
  context.currentUser = null;
  context.currentRoom = null;
}

module.exports = {
  handleJoinRoom,
  handleLeaveRoom,
  handleUserDisconnect
};