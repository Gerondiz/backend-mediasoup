// services/mediasoupService.js
const mediasoup = require('mediasoup');
const config = require('../config/mediasoup');
const logger = require('../utils/logger');

class MediasoupService {
  constructor() {
    this.workers = [];
    this.nextWorkerIndex = 0;
  }

  async initialize() {
    // Создаем рабочих
    for (let i = 0; i < config.numWorkers; i++) {
      const worker = await mediasoup.createWorker({
        logLevel: config.worker.logLevel,
        logTags: config.worker.logTags,
        rtcMinPort: config.worker.rtcMinPort,
        rtcMaxPort: config.worker.rtcMaxPort
      });

      worker.on('died', () => {
        logger.error('Mediasoup worker died, exiting in 2 seconds...');
        setTimeout(() => process.exit(1), 2000);
      });

      this.workers.push(worker);
      logger.info(`Mediasoup worker ${i} created`);
    }
  }

  getNextWorker() {
    const worker = this.workers[this.nextWorkerIndex];
    this.nextWorkerIndex = (this.nextWorkerIndex + 1) % this.workers.length;
    return worker;
  }

  async createRouter(mediaCodecs = config.router.mediaCodecs) {
    const worker = this.getNextWorker();
    return worker.createRouter({ mediaCodecs });
  }

  getWebRtcTransportOptions() {
    return config.webRtcTransport;
  }
}

module.exports = new MediasoupService();