// utils/network.js
const https = require('https');
const logger = require('./logger');

/**
 * Получает внешний IP-адрес сервера, выполняя HTTPS-запрос к внешнему сервису.
 * @returns {Promise<string>} Внешний IP-адрес.
 */
async function getExternalIP() {
  const services = [
    'https://api.ipify.org',
    'https://icanhazip.com',
    'https://ident.me',
    'https://ipecho.net/plain',
    'https://myexternalip.com/raw'
  ];

  for (const service of services) {
    try {
      logger.info(`📡 Attempting to fetch external IP from ${service}...`);
      const ip = await new Promise((resolve, reject) => {
        const req = https.get(service, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => {
            const ip = data.trim();
            // Простая проверка, является ли строка IP-адресом
            if (/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip)) {
              resolve(ip);
            } else {
              reject(new Error(`Invalid IP format received: ${ip}`));
            }
          });
        });
        req.on('error', reject);
        req.setTimeout(5000, () => {
          req.destroy();
          reject(new Error('Request timeout'));
        });
      });
      
      logger.info(`✅ Successfully fetched external IP: ${ip}`);
      return ip;
    } catch (err) {
      logger.warn(`⚠️ Failed to get IP from ${service}: ${err.message}`);
    }
  }
  
  throw new Error('Could not determine external IP from any service');
}

module.exports = { getExternalIP };