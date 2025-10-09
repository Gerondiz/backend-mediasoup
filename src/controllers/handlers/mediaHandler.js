// handlers/mediaHandler.js
const logger = require('../../utils/logger');


async function handleProduce(data, context) {
  const { transportId, kind, rtpParameters } = data;
  const { currentRoom, currentUser, sendError, sendToClient, broadcastToRoom } = context;

  if (!currentRoom || !currentUser) {
    sendError('Not joined to any room');
    return;
  }

  try {
    const transport = currentRoom.transports.get(transportId);

    if (!transport) {
      sendError('Transport not found');
      return;
    }

    // ✅ Создаем producer ДО логирования
    const producer = await transport.produce({
      kind,
      rtpParameters,
      appData: { userId: currentUser.id }
    });

    // ✅ Теперь логируем
    logger.info('🎤 Producer created:', producer.id, 'for user:', currentUser.id);

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

async function handleConsume(data, context) {
  const { transportId, producerId, rtpCapabilities } = data;
  const { currentRoom, currentUser, sendError, sendToClient } = context;

  if (!currentRoom || !currentUser) {
    sendError('Not joined to any room');
    return;
  }

  try {
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

    logger.info('🎧 Consumer created:', consumer.id, 'for producer:', producerId);

    consumer.on('@close', () => {
      currentRoom.consumers.delete(consumer.id);
      currentUser.consumers.delete(consumer.id);
    });

  } catch (error) {
    logger.error('Error consuming:', error);
    sendError('Failed to consume');
  }
}

async function handleGetProducers(context) {
  const { currentRoom, currentUser, sendError, sendToClient } = context;
  
  if (!currentRoom) {
    sendError('Not joined to any room');
    return;
  }

  logger.info('📋 Sending producers list to user:', currentUser?.username); // ✅ Добавь лог

  const producersList = Array.from(currentRoom.producers.entries())
    .map(([id, producer]) => ({
      producerId: id,
      userId: producer.appData.userId,
      kind: producer.kind
    }));

  sendToClient('producers-list', { producers: producersList });
}

module.exports = {
  handleProduce,
  handleConsume,
  handleGetProducers
};