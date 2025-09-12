// server.js
const logger = require('./utils/logger');
const { getExternalIP } = require('./utils/network');

async function setupEnvironment() {
  if (!process.env.ANNOUNCED_IP) {
    logger.info('🔍 ANNOUNCED_IP not set in environment, attempting to auto-detect...');
    try {
      const externalIP = await getExternalIP();
      process.env.ANNOUNCED_IP = externalIP;
      logger.info(`🌐 Auto-detected and set ANNOUNCED_IP to: ${externalIP}`);
      
      // --- ВАЖНО: Обновляем конфигурацию mediasoup ---
      const config = require('./config');
      // Обновляем объект напрямую
      config.mediasoup.webRtcTransport.listenIps[0].announcedIp = externalIP;
      logger.info(`🔧 Updated mediasoup webRtcTransport announcedIp to: ${externalIP}`);
      
    } catch (ipError) {
      logger.error('❌ Failed to auto-detect external IP:', ipError.message);
      logger.warn('⚠️ Server may not work correctly for WebRTC. Please set ANNOUNCED_IP manually.');
    }
  } else {
    logger.info(`🌐 Using ANNOUNCED_IP from environment: ${process.env.ANNOUNCED_IP}`);
    // --- Обновляем конфигурацию, если IP задан в env ---
    const config = require('./config');
    config.mediasoup.webRtcTransport.listenIps[0].announcedIp = process.env.ANNOUNCED_IP;
    logger.info(`🔧 Updated mediasoup webRtcTransport announcedIp from env to: ${process.env.ANNOUNCED_IP}`);
  }
}

async function startServer() {
  try {
    await setupEnvironment();

    // Теперь безопасно импортируем App
    const App = require('./app');

    const app = new App();
    await app.start();

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();