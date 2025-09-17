// config/index.js
const path = require('path');

module.exports = {
  server: {
    host: process.env.HOST || '0.0.0.0',
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : (process.env.PORT || 3001),
    allowedOrigins: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()) // <-- .map(origin => origin.trim())
      : ['https://webrtc-video-conference-two.vercel.app', 'http://20.0.0.107:3000'],
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
      rtcMinPort: 40000,
      rtcMaxPort: 49999,
      logLevel: 'warn',
      logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp']
    },
    webRtcTransport: {
      listenIps: [
        {
          ip: '0.0.0.0',
          announcedIp: process.env.ANNOUNCED_IP || '20.0.0.107'
        }
      ],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      maxIncomingBitrate: 1500000,
      initialAvailableOutgoingBitrate: 1000000
    }
  },
  turn: {
    // url: process.env.TURN_URL || 'turn:20.0.0.107:3478',
    // username: process.env.TURN_USERNAME || 'turnuser',
    // credential: process.env.TURN_CREDENTIAL || '12345678'
    servers: [
      { urls: 'stun:stun.l.google.com:19302' },
      {
        urls: "stun:stun.relay.metered.ca:80",
      },
      {
        urls: "turn:global.relay.metered.ca:80",
        username: "62ebcffbcf6c87c9ed6ce75c",
        credential: "6QxuV6wxCX5bEgL6",
      },
      {
        urls: "turn:global.relay.metered.ca:80?transport=tcp",
        username: "62ebcffbcf6c87c9ed6ce75c",
        credential: "6QxuV6wxCX5bEgL6",
      },
      {
        urls: "turn:global.relay.metered.ca:443",
        username: "62ebcffbcf6c87c9ed6ce75c",
        credential: "6QxuV6wxCX5bEgL6",
      },
      {
        urls: "turns:global.relay.metered.ca:443?transport=tcp",
        username: "62ebcffbcf6c87c9ed6ce75c",
        credential: "6QxuV6wxCX5bEgL6",
      },
    ],
  }
};