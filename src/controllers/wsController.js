// controllers/wsController.js
const roomService = require('../services/roomService');
const mediasoupService = require('../services/mediasoupService');
const User = require('../models/User');
const logger = require('../utils/logger');

// Обработка WebSocket соединений
function handleWebSocketConnection(ws, req) {
  logger.info('New WebSocket connection');

  let currentUser = null;
  let currentRoom = null;

  // Отправка ошибки клиенту
  const sendError = (message) => {
    ws.send(JSON.stringify({
      type: 'error',
      data: { message }
    }));
  };

  // Отправка сообщения клиенту
  const sendToClient = (type, data) => {
    ws.send(JSON.stringify({ type, data }));
  };

  // Рассылка сообщения всем участникам комнаты кроме отправителя
  const broadcastToRoom = (type, data, excludeSelf = true) => {
    if (!currentRoom) return;

    currentRoom.users.forEach(user => {
      if (user.socket !== ws || !excludeSelf) {
        try {
          user.socket.send(JSON.stringify({ type, data }));
        } catch (error) {
          logger.error('Error sending message to user:', error);
        }
      }
    });
  };

  // Обработчик входящих сообщений
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);
      logger.debug(`Received message type: ${message.type}`);

      switch (message.type) {
        case 'join-room':
          await handleJoinRoom(message.data);
          break;

        case 'create-transport':
          await handleCreateTransport(message.data);
          break;

        case 'connect-transport':
          await handleConnectTransport(message.data);
          break;

        case 'produce':
          await handleProduce(message.data);
          break;

        case 'consume':
          await handleConsume(message.data);
          break;

        case 'get-producers':
          await handleGetProducers();
          break;

        case 'leave-room':
          await handleLeaveRoom();
          break;

        case 'chat-message':
          handleChatMessage(message.data);
          break;

        default:
          logger.warn('Unknown message type:', message.type);
          sendError(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      logger.error('Error processing message:', error);
      sendError('Invalid message format');
    }
  });

  // Обработчик закрытия соединения
  ws.on('close', () => {
    logger.info(`User ${currentUser ? currentUser.id : 'unknown'} disconnected`);
    if (currentUser && currentRoom) {
      handleUserDisconnect();
    }
  });

  // Обработчик ошибок
  ws.on('error', (error) => {
    logger.error('WebSocket error:', error);
  });

  // Обработка присоединения к комнате
  async function handleJoinRoom(data) {
    const { roomId, username, sessionId } = data;
    
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
        user.socket = ws;
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
        user = new User(userId, username, ws, sessionId);
        room.addUser(user);
        
        // Уведомляем других участников о новом пользователе
        broadcastToRoom('user-joined', {
          user: user.toJSON()
        });
      }

      currentUser = user;
      currentRoom = room;

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

  // Обработка создания транспорта
  async function handleCreateTransport(data) {
    if (!currentRoom || !currentUser) {
      sendError('Not joined to any room');
      return;
    }

    try {
      const { direction } = data;
      const transport = await currentRoom.router.createWebRtcTransport(
        mediasoupService.getWebRtcTransportOptions()
      );

      // Сохраняем транспорт
      currentRoom.transports.set(transport.id, transport);
      currentUser.transports.set(transport.id, { transport, direction });

      // Настройка обработчиков событий транспорта
      transport.on('dtlsstatechange', (dtlsState) => {
        logger.debug(`Transport DTLS state changed to: ${dtlsState}`);
        if (dtlsState === 'closed' || dtlsState === 'failed') {
          transport.close();
        }
      });

      transport.on('@close', () => {
        currentRoom.transports.delete(transport.id);
        currentUser.transports.delete(transport.id);
      });

      // Отправляем информацию о транспорте клиенту
      sendToClient('webRtcTransportCreated', {
        transportId: transport.id,
        direction,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters
      });

    } catch (error) {
      logger.error('Error creating transport:', error);
      sendError('Failed to create transport');
    }
  }

  // Обработка подключения транспорта
  async function handleConnectTransport(data) {
    if (!currentRoom || !currentUser) {
      sendError('Not joined to any room');
      return;
    }

    try {
      const { transportId, dtlsParameters } = data;
      const transport = currentRoom.transports.get(transportId);

      if (!transport) {
        sendError('Transport not found');
        return;
      }

      await transport.connect({ dtlsParameters });
      sendToClient('transport-connected', { transportId });
    } catch (error) {
      logger.error('Error connecting transport:', error);
      sendError('Failed to connect transport');
    }
  }

  // Обработка создания производителя
  async function handleProduce(data) {
    if (!currentRoom || !currentUser) {
      sendError('Not joined to any room');
      return;
    }

    try {
      const { transportId, kind, rtpParameters } = data;
      const transport = currentRoom.transports.get(transportId);

      if (!transport) {
        sendError('Transport not found');
        return;
      }

      const producer = await transport.produce({
        kind,
        rtpParameters,
        appData: { userId: currentUser.id }
      });

      // Сохраняем производителя
      currentRoom.producers.set(producer.id, producer);
      currentUser.producers.set(producer.id, producer);

      // Уведомляем других участников о новом производителе
      broadcastToRoom('new-producer', {
        producerId: producer.id,
        userId: currentUser.id,
        kind
      });

      // Отправляем подтверждение клиенту
      sendToClient('produced', { producerId: producer.id });

      producer.on('@close', () => {
        currentRoom.producers.delete(producer.id);
        currentUser.producers.delete(producer.id);
        broadcastToRoom('producer-closed', {
          producerId: producer.id,
          userId: currentUser.id
        });
      });

    } catch (error) {
      logger.error('Error producing:', error);
      sendError('Failed to produce');
    }
  }

  // Обработка создания потребителя
  async function handleConsume(data) {
    if (!currentRoom || !currentUser) {
      sendError('Not joined to any room');
      return;
    }

    try {
      const { transportId, producerId, rtpCapabilities } = data;
      const transport = currentRoom.transports.get(transportId);
      const producer = currentRoom.producers.get(producerId);

      if (!transport || !producer) {
        sendError('Transport or producer not found');
        return;
      }

      // Проверяем возможность потребления
      if (!currentRoom.router.canConsume({
        producerId,
        rtpCapabilities: currentUser.rtpCapabilities
      })) {
        sendError('Cannot consume this producer');
        return;
      }

      const consumer = await transport.consume({
        producerId,
        rtpCapabilities,
        paused: false
      });

      // Сохраняем потребителя
      currentRoom.consumers.set(consumer.id, consumer);
      currentUser.consumers.set(consumer.id, consumer);

      // Отправляем информацию о consumer клиенту
      sendToClient('consumed', {
        consumerId: consumer.id,
        producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
        userId: producer.appData.userId
      });

      consumer.on('@close', () => {
        currentRoom.consumers.delete(consumer.id);
        currentUser.consumers.delete(consumer.id);
      });

    } catch (error) {
      logger.error('Error consuming:', error);
      sendError('Failed to consume');
    }
  }

  // Обработка получения списка производителей
  async function handleGetProducers() {
    if (!currentRoom) {
      sendError('Not joined to any room');
      return;
    }

    const producersList = Array.from(currentRoom.producers.entries())
      .map(([id, producer]) => ({
        producerId: id,
        userId: producer.appData.userId,
        kind: producer.kind
      }));

    sendToClient('producers-list', { producers: producersList });
  }

  // Обработка выхода из комнаты
  async function handleLeaveRoom() {
    if (currentRoom && currentUser) {
      handleUserDisconnect();
    }
  }

  // Обработка сообщения чата
  function handleChatMessage(data) {
    if (!currentRoom || !currentUser) {
      sendError('Not joined to any room');
      return;
    }

    const { text } = data;
    
    // Пересылаем сообщение всем участникам комнаты
    broadcastToRoom('chat-message', {
      from: currentUser.username,
      text,
      timestamp: new Date().toISOString()
    }, false); // false = включая отправителя
  }

  // Обработка отключения пользователя
  function handleUserDisconnect() {
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
    currentUser = null;
    currentRoom = null;
  }
}

module.exports = {
  handleWebSocketConnection
};