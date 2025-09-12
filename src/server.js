// server.js
const App = require('./app');
const logger = require('./utils/logger');
const { getExternalIP } = require('./utils/network'); // <-- Добавлен импорт

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// --- Добавлен асинхронный запуск ---
async function startServer() {
  try {
    // Автоматическое определение внешнего IP, если он не задан в env
    if (!process.env.ANNOUNCED_IP) {
      logger.info('🔍 ANNOUNCED_IP not set in environment, attempting to auto-detect...');
      try {
        const externalIP = await getExternalIP();
        // Устанавливаем переменную окружения программно
        process.env.ANNOUNCED_IP = externalIP;
        logger.info(`🌐 Auto-detected and set ANNOUNCED_IP to: ${externalIP}`);
      } catch (ipError) {
        logger.error('❌ Failed to auto-detect external IP:', ipError.message);
        logger.warn('⚠️ Server may not work correctly for WebRTC. Please set ANNOUNCED_IP manually.');
        // Можно либо выйти, либо продолжить с дефолтным значением
        // process.exit(1);
      }
    } else {
      logger.info(`🌐 Using ANNOUNCED_IP from environment: ${process.env.ANNOUNCED_IP}`);
    }

    // Запуск приложения
    const app = new App();
    await app.start(); // <-- Убедитесь, что start теперь async

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();