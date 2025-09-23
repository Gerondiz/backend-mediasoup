// app.js (обновленная версия)
// require('dotenv').config();

const express = require('express');
const http = require('http');
const https = require('https'); // Добавлено
const fs = require('fs'); // Добавлено
const WebSocket = require('ws');
const cors = require('cors');
const config = require('./config');
const apiController = require('./controllers/apiController');
const wsController = require('./controllers/wsController');
const mediasoupService = require('./services/mediasoupService');
const roomService = require('./services/roomService');
const logger = require('./utils/logger');

class App {
  constructor() {
    this.app = express();
    // this.server = http.createServer(this.app); // Удалено или изменено

    this.setupMiddleware();
    this.setupRoutes();
    // this.setupWebSocket(); // Вызывается после создания сервера
  }

  setupMiddleware() {
    // Удаляем лишние пробелы из allowedOrigins
    const cleanedAllowedOrigins = config.server.allowedOrigins.map(origin => origin.trim()).filter(origin => origin.length > 0);
    logger.info(`Setting up CORS with origins: ${JSON.stringify(cleanedAllowedOrigins)}`);
    this.app.use(cors({
      origin: cleanedAllowedOrigins, // Используем очищенный массив
      credentials: true
    }));
    this.app.use(express.json());
  }

  setupRoutes() {
    // API маршруты
    this.app.get('/api/health', apiController.healthCheck);
    this.app.post('/api/create-room', apiController.createRoom);
    this.app.post('/api/join-room', apiController.joinRoom);

    // Mediasoup маршруты
    this.app.get('/router-capabilities', async (req, res) => {
      try {
        const roomId = req.query.roomId;
        const room = roomService.getRoom(roomId);

        if (!room || !room.router) {
          return res.status(404).json({ error: 'Room not found' });
        }

        res.json(room.router.rtpCapabilities);
      } catch (error) {
        logger.error('Error getting router capabilities:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    this.app.get('/ice-servers', (req, res) => {
      // Объединяем STUN и TURN серверы из конфигурации
      const iceServers = [
        ...(config.turn.stunServers || []),
        ...(config.turn.turnServers || [])
      ];

      res.json(iceServers);
    });
  }

  setupWebSocket() {
    // Проверяем, существует ли this.server перед использованием
    if (!this.server) {
      logger.error('Cannot setup WebSocket: Server not initialized');
      return;
    }
    logger.info('Setting up WebSocket server on HTTP/HTTPS server instance');
    this.wss = new WebSocket.Server({ server: this.server });
    this.wss.on('connection', wsController.handleWebSocketConnection);
    logger.info('WebSocket server setup complete');
  }

  async start() {
    try {
      // Инициализируем Mediasoup
      await mediasoupService.initialize();

      let serverOptions = {};
      let serverModule = http;
      let protocol = 'http';

      if (config.server.useHttps) {
        try {
          const keyPath = config.server.keyFile; // Используем путь из конфига
          const certPath = config.server.certFile; // Используем путь из конфига

          serverOptions = {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath)
          };
          serverModule = https;
          protocol = 'https';
          logger.info(`HTTPS enabled. Using key: ${keyPath}, cert: ${certPath}`);
        } catch (sslError) {
          logger.error('Failed to read SSL certificate/key files:', sslError.message);
          logger.warn('Falling back to HTTP.');
          serverModule = http;
          protocol = 'http';
          // Не устанавливаем serverOptions для HTTPS
        }
      }

      // Создаем сервер (HTTP или HTTPS)
      this.server = serverModule.createServer(serverOptions, this.app);

      // Теперь можно настроить WebSocket
      this.setupWebSocket();

      // Запускаем сервер
      this.server.listen(config.server.port, config.server.host, () => {
        logger.info(`Server running on ${protocol}://${config.server.host}:${config.server.port}`);
        logger.info(`Health check available at ${protocol}://${config.server.host}:${config.server.port}/api/health`);
        // logger.info(`IP check endpoint available at ${protocol}://${config.server.host}:${config.server.port}/my-ip`); // Закомментировано, так как маршрут /my-ip не определен
      });

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }
}

module.exports = App;