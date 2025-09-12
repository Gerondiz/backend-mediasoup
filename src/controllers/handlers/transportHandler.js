// handlers/transportHandler.js
const logger = require('../../utils/logger');

async function handleCreateTransport(data, context) {
  const { direction } = data;
  const { currentRoom, currentUser, sendError, sendToClient } = context;

  logger.info('🔧 Init transport create:', { direction, username: currentUser?.username });

  // Проверяем, что пользователь присоединен к комнате
  if (!currentRoom || !currentUser) {
    logger.info('🔧 Not joined to any room');
    sendError('Not joined to any room');
    return;
  }

  logger.info('🔧 Creating transport for direction:', direction, 'for user:', currentUser.username);

  try {
    const transport = await currentRoom.router.createWebRtcTransport(
      require('../../services/mediasoupService').getWebRtcTransportOptions()
    );

    // Сохраняем транспорт
    currentRoom.transports.set(transport.id, transport);
    currentUser.transports.set(transport.id, { transport, direction });

    // Настройка обработчиков событий транспорта
    transport.on('dtlsstatechange', (dtlsState) => {
      logger.debug(`Transport DTLS state changed to: ${dtlsState} for user: ${currentUser.username}`);
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

async function handleConnectTransport(data, context) {
  const { transportId, dtlsParameters } = data;
  const { currentRoom, currentUser, sendError, sendToClient } = context;
  
  logger.info('🔗 Connecting transport:', transportId, 'for user:', currentUser?.username);
  
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

    await transport.connect({ dtlsParameters });
    sendToClient('transport-connected', { transportId });
    logger.info('✅ Transport connected successfully for user:', currentUser.username);
  } catch (error) {
    logger.error('Error connecting transport:', error);
    sendError('Failed to connect transport');
  }
}

module.exports = {
  handleCreateTransport,
  handleConnectTransport
};