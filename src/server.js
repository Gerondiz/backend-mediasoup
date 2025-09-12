// server.js
const logger = require('./utils/logger');
const { getExternalIP } = require('./utils/network');

// --- Перемещаем логику определения IP сюда, до импорта App ---
async function setupEnvironment() {
  if (!process.env.ANNOUNCED_IP) {
    logger.info('🔍 ANNOUNCED_IP not set in environment, attempting to auto-detect...');
    try {
      const externalIP = await getExternalIP();
      process.env.ANNOUNCED_IP = externalIP;
      logger.info(`🌐 Auto-detected and set ANNOUNCED_IP to: ${externalIP}`);
    } catch (ipError) {
      logger.error('❌ Failed to auto-detect external IP:', ipError.message);
      logger.warn('⚠️ Server may not work correctly for WebRTC. Please set ANNOUNCED_IP manually.');
      // process.exit(1); // Опционально: остановить запуск при ошибке
    }
  } else {
    logger.info(`🌐 Using ANNOUNCED_IP from environment: ${process.env.ANNOUNCED_IP}`);
  }
}

// --- Импортируем App только после установки env ---
async function startServer() {
  try {
    await setupEnvironment(); // <-- Сначала настраиваем окружение

    // Теперь безопасно импортируем App и другие модули, зависящие от конфигурации
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