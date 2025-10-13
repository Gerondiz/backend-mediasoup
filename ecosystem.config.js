// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'sfu',
    script: 'src/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    // Запускаем от root, но указываем рабочую директорию
    cwd: '/home/user/progs/backend-mediasoup',
    // Переменные окружения — явно!
    env: {
      NODE_ENV: 'production',
      HOST: '0.0.0.0',
      PORT: '443',
      USE_HTTPS: 'true',
      ALLOWED_ORIGINS: 'https://webrtc-video-conference-two.vercel.app',
      CERT_FILE: '/etc/letsencrypt/live/sfu.ddns.net/fullchain.pem',
      KEY_FILE: '/etc/letsencrypt/live/sfu.ddns.net/privkey.pem',
      TURN_USERNAME: 'turnuser',
      TURN_CREDENTIAL: '12345678',
      TURN_URLS: 'turn:sfu.ddns.net:80,turn:sfu.ddns.net:80?transport=tcp,turn:sfu.ddns.net:80?transport=udp',
      MEDIASOUP_WORKERS: '2',
      MEDIASOUP_RTC_MIN_PORT: '40000',
      MEDIASOUP_RTC_MAX_PORT: '40099',
      ANNOUNCED_IP: '176.109.109.217'  // ← обязательно!
    }
  }]
};