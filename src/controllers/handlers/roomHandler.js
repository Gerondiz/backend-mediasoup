// handlers/roomHandler.js
const roomService = require('../../services/roomService');
const mediasoupService = require('../../services/mediasoupService');
const User = require('../../models/User');
const logger = require('../../utils/logger');

async function handleJoinRoom(data, context) {
  const { roomId, username, sessionId } = data;
  const { sendError, sendToClient, broadcastToRoom } = context;
  try {
    let room = roomService.getRoom(roomId);
    if (!room) {
      room = roomService.createRoom(roomId);
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

    if (user) {
      user.socket = context.ws;
      user.isConnected = true;
      user.lastActivity = Date.now();

      broadcastToRoom('user-connection-status', {
        userId: user.id,
        isConnected: true
      });
    } else {
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      user = new User(userId, username, context.ws, sessionId);
      room.addUser(user);

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

    context.currentUser = user;
    context.currentRoom = room;

    sendToClient('joined', {
      roomId,
      users: room.getUsersList(),
      sessionId: user.sessionId,
      rtpCapabilities,
    });

    broadcastToRoom('users-updated', {
      users: room.getUsersList()
    }, 10);

    logger.info(`User ${username} joined room ${roomId}`);
  } catch (error) {
    logger.error('Join room error:', error);
    sendError(error.message);
  }
}

// ✅ Добавь эти функции (если их нет)
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

  currentRoom.removeUser(currentUser.id);

  currentUser.transports.forEach(({ transport }) => {
    transport.close();
  });

  currentUser.producers.forEach(producer => {
    producer.close();
  });

  currentUser.consumers.forEach(consumer => {
    consumer.close();
  });

  broadcastToRoom('user-left', {
    userId: currentUser.id,
    username: currentUser.username
  });

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

// ✅ Экспорт ВСЕХ функций
module.exports = {
  handleJoinRoom,
  handleLeaveRoom,
  handleUserDisconnect
};