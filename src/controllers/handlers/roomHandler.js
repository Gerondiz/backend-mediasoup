// handlers/roomHandler.js
const roomService = require('../../services/roomService');
const mediasoupService = require('../../services/mediasoupService');
const RoomWithChat = require('../../models/RoomWithChat');
const User = require('../../models/User');
const logger = require('../../utils/logger');

async function handleJoinRoom(data, context) {
  const { roomId, username, sessionId } = data;
  const { sendError, sendToClient, broadcastToRoom } = context;

  try {
    let room = roomService.getRoom(roomId);
    if (!room) {
      // ✅ Создаем комнату с поддержкой чата
      room = new RoomWithChat(roomId);
      roomService.rooms.set(roomId, room); // Обновляем в roomService
      logger.info(`Room created: ${roomId}`);
    }

    if (!roomService.canJoinRoom(roomId)) {
      sendError('Room is full');
      return;
    }

    if (!room.router) {
      room.router = await mediasoupService.createRouter();
      logger.info(`Router created for room: ${roomId}`);
    }

    const rtpCapabilities = room.router.rtpCapabilities;

    let user = room.getUserBySessionId(sessionId);

    // Устанавливаем контекст ДО любой отправки сообщений
    if (user) {
      // Обновляем существующего пользователя
      user.socket = context.ws;
      user.isConnected = true;
      user.lastActivity = Date.now();

      // Устанавливаем контекст
      context.currentUser = user;
      context.currentRoom = room;

      // Уведомляем других участников
      broadcastToRoom('user-connection-status', {
        userId: user.id,
        isConnected: true
      });
    } else {
      // Создаем нового пользователя
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      user = new User(userId, username, context.ws, sessionId, rtpCapabilities);
      room.addUser(user);

      user.rtpCapabilities = rtpCapabilities;

      // Устанавливаем контекст ПЕРЕД отправкой любых сообщений
      context.currentUser = user;
      context.currentRoom = room;

      // Уведомляем других участников о новом пользователе
      broadcastToRoom('user-joined', {
        user: user.toJSON()
      });
    }

    logger.info(`Room ${roomId} state after join:`, {
      userCount: room.users.size,
      users: Array.from(room.users.values()).map(u => u.username),
      hasRouter: !!room.router,
      currentUser: context.currentUser?.username,
      currentRoom: context.currentRoom?.id,
    });

    // ✅ Отправляем joined с историей чата
    sendToClient('joined', {
      roomId,
      users: room.getUsersList(),
      sessionId: user.sessionId,
      rtpCapabilities,
      chatHistory: room.getChatHistory(), // ✅ Добавляем историю
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

function handleLeaveRoom(context) {
  const { currentUser, currentRoom } = context;

  if (currentRoom && currentUser) {
    logger.info(`User ${currentUser.username} left room ${currentRoom.id} (intentional leave)`);
    handleUserDisconnect(context);
  }
}

function handleUserDisconnect(context) {
  const { currentUser, currentRoom, broadcastToRoom } = context;

  if (!currentRoom || !currentUser) return;

  currentUser.isConnected = false;
  currentUser.lastDisconnected = Date.now();

  broadcastToRoom('user-connection-status', {
    userId: currentUser.id,
    isConnected: false
  });

  // ✅ Отправляем уведомления о закрытии producer'ов ДО удаления пользователя
  currentUser.producers.forEach(producer => {
    // Уведомляем всех участников комнаты о закрытии producer'а
    broadcastToRoom('producer-closed', {
      producerId: producer.id,
      userId: currentUser.id
    });
    
    // Закрываем producer
    producer.close();
  });

  // Закрываем transports после producer'ов
  currentUser.transports.forEach(({ transport }) => {
    transport.close();
  });

  // Очищаем consumers (они уже будут закрыты на клиенте)
  currentUser.consumers.forEach(consumer => {
    consumer.close();
  });

  // Удаляем пользователя из комнаты
  currentRoom.removeUser(currentUser.id);

  // Уведомляем о выходе пользователя
  broadcastToRoom('user-left', {
    userId: currentUser.id,
    username: currentUser.username
  });

  // Обновляем список пользователей
  broadcastToRoom('users-updated', {
    users: currentRoom.getUsersList()
  });

  logger.info(`User ${currentUser.username} left room ${currentRoom.id}`);

  if (currentRoom.isEmpty()) {
    roomService.deleteRoom(currentRoom.id);
    logger.info(`Room ${currentRoom.id} deleted (empty)`);
  }

  context.currentUser = null;
  context.currentRoom = null;
}

module.exports = {
  handleJoinRoom,
  handleLeaveRoom,
  handleUserDisconnect
};