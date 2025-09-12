//app.js
require('dotenv').config();

const express = require('express');
const http = require('http');
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
    this.server = http.createServer(this.app);
    this.wss = new WebSocket.Server({ server: this.server });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }

  setupMiddleware() {
    logger.info(`Setting up CORS with origins:  ${config.server.allowedOrigins}`);
    this.app.use(cors({
      origin: config.server.allowedOrigins,
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
      // const iceServers = [
      //   { urls: 'stun:stun.l.google.com:19302' },
      //   { 
      //     urls: config.turn.url,
      //     username: config.turn.username,
      //     credential: config.turn.credential
      //   }
      // ];
      const iceServers = config.turn.servers || [
        { urls: 'stun:stun.l.google.com:19302' },
        {
          urls: config.turn.url,
          username: config.turn.username,
          credential: config.turn.credential
        }
      ];

      res.json(iceServers);
    });
  }

  setupWebSocket() {
    this.wss.on('connection', wsController.handleWebSocketConnection);
  }

  async start() {
    try {
      // Инициализируем Mediasoup
      await mediasoupService.initialize();

      // Запускаем сервер
      this.server.listen(config.server.port, config.server.host, () => {
        logger.info(`Server running on ${config.server.host}:${config.server.port}`);
        logger.info(`Health check available at http://${config.server.host}:${config.server.port}/api/health`);
        logger.info(`IP check endpoint available at http://${config.server.host}:${config.server.port}/my-ip`);
      });
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }
}

module.exports = App;