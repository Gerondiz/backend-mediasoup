// config/index.js
const path = require('path');

module.exports = {
  server: {
    host: process.env.HOST || '0.0.0.0',
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : (process.env.PORT || 3001),
    allowedOrigins: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
      : ['https://webrtc-video-conference-two.vercel.app', 'http://20.0.0.107:3000', 'https://sfu.ddns.net'],
    useHttps: process.env.USE_HTTPS === 'true' || false,
    certFile: process.env.CERT_FILE || 'cert.pem',
    keyFile: process.env.KEY_FILE || 'key.pem'
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  },
  room: {
    maxUsers: parseInt(process.env.MAX_USERS) || 10,
    maxRooms: parseInt(process.env.MAX_ROOMS) || 100,
    sessionTimeout: process.env.SESSION_TIMEOUT || '30m'
  },
  mediasoup: {
    numWorkers: parseInt(process.env.MEDIASOUP_WORKERS) || Object.keys(require('os').networkInterfaces()).length,
    worker: {
      // Вынесены в переменные окружения с дефолтами
      rtcMinPort: parseInt(process.env.MEDIASOUP_RTC_MIN_PORT, 10) || 40000,
      rtcMaxPort: parseInt(process.env.MEDIASOUP_RTC_MAX_PORT, 10) || 49999,
      logLevel: 'warn',
      logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp']
    },
    webRtcTransport: {
      listenIps: [
        {
          ip: '0.0.0.0',
          announcedIp: process.env.ANNOUNCED_IP // Будет перезаписан в server.js
        }
      ],
      enableTcp: process.env.MEDIASOUP_ENABLE_TCP === 'true',
      preferTcp: process.env.MEDIASOUP_PREFER_TCP === 'false',
      enableUdp: process.env.MEDIASOUP_ENABLE_UDP !== 'true',
      preferUdp: process.env.MEDIASOUP_PREFER_UDP !== 'true',

      maxIncomingBitrate: parseInt(process.env.MEDIASOUP_MAX_INCOMING_BITRATE, 10) || 1500000,
      initialAvailableOutgoingBitrate: parseInt(process.env.MEDIASOUP_INITIAL_OUTGOING_BITRATE, 10) || 1000000
    }
  },
  turn: {
    // --- STUN серверы ---
    stunServers: [
      { urls: 'stun:stun.l.google.com:19302' }
    ],

    // --- TURN серверы (настройки из переменных окружения) ---
    turnServers: (() => {
      // Базовые TURN серверы из переменных окружения
      const baseUrls = process.env.TURN_URLS ? process.env.TURN_URLS.split(',') : [
        "turn:sfu.ddns.net:3478",
        "turn:sfu.ddns.net:3478?transport=tcp"
      ];

      // Формируем массив объектов для каждого TURN сервера
      return baseUrls.map(url => ({
        urls: url.trim(), // Убедимся, что нет лишних пробелов
        username: process.env.TURN_USERNAME || "turnuser",
        credential: process.env.TURN_CREDENTIAL || "12345678"
      }));
    })()
  }
};