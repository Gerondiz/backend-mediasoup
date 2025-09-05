const logger = require('../../utils/logger');

async function handleCreateTransport(data, context) {
  const { direction } = data;
  const { currentRoom, currentUser, sendError, sendToClient } = context;
  
  if (!currentRoom || !currentUser) {
    sendError('Not joined to any room');
    return;
  }

  try {
    const transport = await currentRoom.router.createWebRtcTransport(
      require('../../services/mediasoupService').getWebRtcTransportOptions()
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

async function handleConnectTransport(data, context) {
  const { transportId, dtlsParameters } = data;
  const { currentRoom, currentUser, sendError, sendToClient } = context;
  
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
  } catch (error) {
    logger.error('Error connecting transport:', error);
    sendError('Failed to connect transport');
  }
}

module.exports = {
  handleCreateTransport,
  handleConnectTransport
};