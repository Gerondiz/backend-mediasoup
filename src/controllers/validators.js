// controllers/validators.js
const validators = {
  'join-room': (data) => {
    if (!data || typeof data !== 'object') throw new Error('Invalid data format');
    if (typeof data.roomId !== 'string' || !data.roomId.trim()) throw new Error('Room ID is required');
    if (typeof data.username !== 'string' || !data.username.trim()) throw new Error('Username is required');
    if (typeof data.sessionId !== 'string') throw new Error('Session ID is required');
    return {
      roomId: data.roomId.trim(),
      username: data.username.trim(),
      sessionId: data.sessionId.trim()
    };
  },

  'create-transport': (data) => {
    if (!data || typeof data !== 'object') throw new Error('Invalid data format');
    if (data.direction !== 'send' && data.direction !== 'recv') throw new Error('Direction must be send or recv');
    return { direction: data.direction };
  },

  'connect-transport': (data) => {
    if (!data || typeof data !== 'object') throw new Error('Invalid data format');
    if (typeof data.transportId !== 'string' || !data.transportId) throw new Error('Transport ID is required');
    if (!data.dtlsParameters || typeof data.dtlsParameters !== 'object') throw new Error('DTLS parameters are required');
    return {
      transportId: data.transportId,
      dtlsParameters: data.dtlsParameters
    };
  },

  'produce': (data) => {
    if (!data || typeof data !== 'object') throw new Error('Invalid data format');
    if (typeof data.transportId !== 'string' || !data.transportId) throw new Error('Transport ID is required');
    if (data.kind !== 'audio' && data.kind !== 'video') throw new Error('Kind must be audio or video');

    // ✅ Валидация rtpParameters
    if (!data.rtpParameters || typeof data.rtpParameters !== 'object') throw new Error('RTP parameters are required');
    if (!data.rtpParameters.codecs || !Array.isArray(data.rtpParameters.codecs)) throw new Error('RTP parameters must include codecs array');
    if (!data.rtpParameters.encodings || !Array.isArray(data.rtpParameters.encodings)) throw new Error('RTP parameters must include encodings array');

    return {
      transportId: data.transportId,
      kind: data.kind,
      rtpParameters: data.rtpParameters
    };
  },

  'get-producers': (data) => {
    // get-producers не требует данных, но должен быть объектом
    if (data && typeof data !== 'object') throw new Error('Invalid data format');
    return {}; // Возвращаем пустой объект
  },

  'consume': (data) => {
    if (!data || typeof data !== 'object') throw new Error('Invalid data format');
    if (typeof data.transportId !== 'string' || !data.transportId) throw new Error('Transport ID is required');
    if (typeof data.producerId !== 'string' || !data.producerId) throw new Error('Producer ID is required');
    if (!data.rtpCapabilities || typeof data.rtpCapabilities !== 'object') throw new Error('RTP capabilities are required');
    return {
      transportId: data.transportId,
      producerId: data.producerId,
      rtpCapabilities: data.rtpCapabilities
    };
  },

  'chat-message': (data) => {
    if (!data || typeof data !== 'object') throw new Error('Invalid data format');
    if (typeof data.text !== 'string' || !data.text.trim()) throw new Error('Message text is required');
    return { text: data.text.trim() };
  }
};

module.exports = validators;