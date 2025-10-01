// src/tunnelManager.js
const { spawn } = require('child_process');
const axios = require('axios');
const logger = require('./utils/logger');
const config = require('./config');

class TunnelManager {
  constructor() {
    this.tunnelProcess = null;
    this.tunnelUrl = null;
    this.isEnabled = (config.server.useCloudflareTunnel === true);
    this.tunnelName = config.server.cloudflareTunnelName || 'sfu-tunnel';
    this.vercelApiUrl = config.server.vercelApiUrl;
  }

  async startTunnel() {
    if (!this.isEnabled) {
      logger.info('❌ Cloudflare Tunnel is disabled via config.');
      return;
    }

    if (!this.vercelApiUrl) { // <--- Проверка
      logger.error('❌ VERCEL_API_URL is not set. Cannot send tunnel URL.');
      console.error('[TUNNEL ERROR]: VERCEL_API_URL is not set. Cannot send tunnel URL.'); // ✅ Добавим в консоль
      return; // <--- Выход из функции
    }

    logger.info(`🚀 Starting Cloudflare Tunnel: ${this.tunnelName}`);

    const protocol = config.server.useHttps ? 'https' : 'http';
    const localUrl = `${protocol}://${config.server.host}:${config.server.port}`;

    logger.info(`🔗 Attempting to create tunnel to: ${localUrl}`);

    this.tunnelProcess = spawn('cloudflared', ['tunnel', '--url', localUrl], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    this.tunnelProcess.on('error', (err) => {
      logger.error('❌ Error starting Cloudflare Tunnel:', err);
      console.error(`[TUNNEL ERROR]: Error starting Cloudflare Tunnel:`, err); // ✅ В консоль
    });

    this.tunnelProcess.on('close', (code) => {
      logger.info(`🔒 Cloudflare Tunnel process exited with code ${code}`);
      this.tunnelProcess = null;
    });

    // Перехватываем stdout для извлечения URL
    let outputBuffer = '';
    this.tunnelProcess.stdout.on('data', (data) => {
      const str = data.toString();
      outputBuffer += str;
      // console.log(`[CLOUDFLARED STDOUT]: ${str}`); // ✅ ВРЕМЕННО: выводим stdout в консоль для отладки
      logger.debug(`.Stdout: ${str}`); // Логируем stdout как debug

      // Ищем строку с URL (в зависимости от версии cloudflared может отличаться)
      // Обычно это что-то вроде: "https://<random-string>.trycloudflare.com"
      const match = outputBuffer.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
      if (match) {
        this.tunnelUrl = match[0];
        logger.info(`🔗 Cloudflare Tunnel URL: ${this.tunnelUrl}`);
        console.log(`[TUNNEL URL FOUND]: ${this.tunnelUrl}`); // ✅ Выводим в консоль

        // Отправляем URL на Vercel
        this.sendTunnelUrlToVercel(this.tunnelUrl);

        // Очищаем буфер, чтобы не срабатывало повторно
        outputBuffer = '';
      }
    });

    // Перехватываем stderr для отладки
    let errorBuffer = '';
    this.tunnelProcess.stderr.on('data', (data) => {
      const str = data.toString();
      errorBuffer += str;
      // console.error(`[CLOUDFLARED STDERR]: ${str}`); // ✅ ВРЕМЕННО: выводим stderr в консоль для отладки
      logger.debug(`.Stderr: ${str}`); // Логируем stderr как debug

      // Ищем URL в stderr (cloudflared выводит его туда)
      const match = str.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
      if (match) {
        this.tunnelUrl = match[0];
        logger.info(`🔗 Cloudflare Tunnel URL (from stderr): ${this.tunnelUrl}`);
        console.log(`[TUNNEL URL FOUND (stderr)]: ${this.tunnelUrl}`); // ✅ Выводим в консоль

        // Отправляем URL на Vercel
        this.sendTunnelUrlToVercel(this.tunnelUrl);
      }

      // Попробуем найти ошибки в stderr
      if (str.toLowerCase().includes('error') || str.toLowerCase().includes('failed') || str.toLowerCase().includes('timeout')) {
          const errorMsg = `🔍 Potential error in cloudflared stderr: ${str.trim()}`;
          logger.warn(errorMsg);
          console.warn(`[TUNNEL ERROR]: ${errorMsg}`); // ✅ Выводим в консоль
      }
    });

    // Периодически проверяем, не накопилось ли ошибок в буфере
    const errorCheckInterval = setInterval(() => {
        if (errorBuffer) {
            const errorMsg = `🔍 Accumulated stderr: ${errorBuffer.trim()}`;
            logger.warn(errorMsg);
            console.warn(`[TUNNEL ERROR BUFFER]: ${errorMsg}`); // ✅ Выводим в консоль
            errorBuffer = ''; // Очищаем буфер после логирования
        }
    }, 10000);

    // Очищаем интервал при завершении процесса
    this.tunnelProcess.on('close', () => {
        clearInterval(errorCheckInterval);
    });
  }

  async sendTunnelUrlToVercel(url) {
    // Добавим лог перед отправкой
    logger.info(`📤 Attempting to send tunnel URL to Vercel: ${url}`);
    console.log(`[TUNNEL SEND ATTEMPT]: ${url} to ${this.vercelApiUrl}`); // ✅ Выводим в консоль

    if (!this.vercelApiUrl) {
      logger.error('❌ VERCEL_API_URL is not set. Cannot send tunnel URL.');
      console.error(`[TUNNEL SEND ERROR (sendTunnelUrlToVercel)]: VERCEL_API_URL is not set.`); // ✅ Выводим в консоль
      return;
    }

    try {
      await axios.post(this.vercelApiUrl, { url });
      logger.info(`✅ Tunnel URL sent to Vercel: ${url}`);
      console.log(`[TUNNEL SENT TO VERCEL]: ${url}`); // ✅ Выводим в консоль
    } catch (error) {
      logger.error('❌ Failed to send tunnel URL to Vercel:', error.message);
      console.error(`[TUNNEL SEND ERROR]:`, error.message); // ✅ Выводим в консоль
      if (error.response) {
        logger.error('Response status:', error.response.status);
        logger.error('Response ', error.response.data);
        console.error(`[TUNNEL SEND RESPONSE ERROR]: Status ${error.response.status}, Data:`, error.response.data); // ✅ Выводим в консоль
      }
    }
  }

  stopTunnel() {
    if (this.tunnelProcess) {
      logger.info('🔒 Stopping Cloudflare Tunnel...');
      this.tunnelProcess.kill('SIGTERM');
      this.tunnelProcess = null;
    }
  }
}

module.exports = TunnelManager;