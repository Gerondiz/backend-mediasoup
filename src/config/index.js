const path = require('path');

module.exports = {
  server: {
    host: process.env.HOST || '0.0.0.0',
    port: process.env.PORT || 3001,
    allowedOrigins: process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',') 
      : ['http://localhost:3000', 'http://20.0.0.107:3000', 'http://20.0.0.201:*'],
    useHttps: process.env.USE_HTTPS === 'true' || false,
    certFile: process.env.CERT_FILE || '20.0.0.107+3.pem',
    keyFile: process.env.KEY_FILE || '20.0.0.107+3-key.pem'
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  },
  room: {
    maxUsers: parseInt(process.env.MAX_USERS) || 10,
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
  }
};