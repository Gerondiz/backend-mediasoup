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
  const { currentUser, currentRoom, broadcastToRoom, pingInterval } = context; // Добавили pingInterval

  if (!currentRoom || !currentUser) return;

  // --- Добавлено для Heartbeat ---
  // Очищаем интервал пингов при отключении пользователя
  if (pingInterval) {
    clearInterval(pingInterval);
    logger.debug(`Cleared ping interval for user: ${currentUser.username}`);
    context.pingInterval = null; // Очищаем ссылку в контексте
  }
  // --- Конец Heartbeat ---

  currentUser.isConnected = false;
  currentUser.lastDisconnected = Date.now();

  broadcastToRoom('user-connection-status', {
    userId: currentUser.id,
    isConnected: false
  });

  // Отправляем уведомления о закрытии producer'ов ДО удаления пользователя
  currentUser.producers.forEach(producer => {
    broadcastToRoom('producer-closed', {
      producerId: producer.id,
      userId: currentUser.id,
      username: currentUser.username
    });
  });

  // Удаляем пользователя из комнаты
  currentRoom.removeUser(currentUser.id);

  // Обновляем список пользователей
  broadcastToRoom('users-updated', { users: currentRoom.getUsersList() });

  logger.info(`User ${currentUser.username} left room ${currentRoom.id}`);

  if (currentRoom.isEmpty()) {
    // Предполагается, что roomService импортирован или доступен
    // Если нет, нужно импортировать или получить доступ через контекст/сервис
    const roomService = require('../../services/roomService');
    roomService.deleteRoom(currentRoom.id);
    logger.info(`Room ${currentRoom.id} deleted (empty)`);
  }

  // Очищаем контекст
  context.currentUser = null;
  context.currentRoom = null;
  // pingInterval уже очищен выше
}

async function handleMicStatusChanged(data, context) {
  const { userId, isMuted } = data;
  const { currentUser, currentRoom, ws } = context;

  // Проверка: пользователь должен быть в комнате
  if (!currentRoom || !currentUser) {
    context.sendError('Not in a room');
    return;
  }

  // Защита от подмены: можно обновлять только свой статус
  if (userId !== currentUser.id) {
    context.sendError('Cannot update another user\'s mic status');
    return;
  }

  // Формируем сообщение для рассылки
  const micStatusMessage = {
    type: 'mic-status-changed',
    data:{
      userId: currentUser.id,
      isMuted: isMuted
    }
};

// Рассылаем всем в комнате, кроме отправителя
for (const user of currentRoom.users.values()) {
  if (
    user.id !== currentUser.id &&
    user.socket &&
    user.socket.readyState === user.socket.OPEN
  ) {
    user.socket.send(JSON.stringify(micStatusMessage));
  }
}

logger.info(
  `User ${currentUser.username} updated mic status to ${isMuted ? 'muted' : 'unmuted'}`
);
}

module.exports = {
  handleJoinRoom,
  handleLeaveRoom,
  handleUserDisconnect,
  handleMicStatusChanged
};