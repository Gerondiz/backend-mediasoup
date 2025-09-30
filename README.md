# backend-mediasoup
# Пример .env

# Server
HOST=0.0.0.0
PORT=443
USE_HTTPS=true
ALLOWED_ORIGINS=https://webrtc-video-conference-two.vercel.app
CERT_FILE=/etc/letsencrypt/live/sfu.ddns.net/fullchain.pem
KEY_FILE=/etc/letsencrypt/live/sfu.ddns.net/privkey.pem

# Logging
LOG_LEVEL=info

# Room
MAX_USERS=8
MAX_ROOMS=2
SESSION_TIMEOUT=360m

# Mediasoup
MEDIASOUP_WORKERS=2
MEDIASOUP_RTC_MIN_PORT=40000
MEDIASOUP_RTC_MAX_PORT=40099

# Mediasoup WebRTC Transport TCP/UDP Settings
MEDIASOUP_ENABLE_TCP=true
MEDIASOUP_PREFER_TCP=true
MEDIASOUP_ENABLE_UDP=true
MEDIASOUP_PREFER_UDP=true
MEDIASOUP_MAX_INCOMING_BITRATE=1500000
MEDIASOUP_INITIAL_OUTGOING_BITRATE=1000000

# TURN Server
TURN_USERNAME=
TURN_CREDENTIAL=
TURN_URLS=turn:sfu.ddns.net:80,turn:sfu.ddns.net:80?transport=tcp


# /etc/turnserver.conf

# Основные настройки
listening-port=80
listening-ip=0.0.0.0
external-ip=109.238.92.48
realm=sfu.ddns.net

# Аутентификация
lt-cred-mech
user=turnuser:turnpass

# Безопасность
fingerprint

# Логирование (убираем проблему с логами)
# log-file=/var/log/turn.log
no-cli

# Дополнительные настройки
no-stun

# Диапазон портов для релея
min-port=49152
max-port=65535

# Критически важные настройки для обхода "Forbidden IP"
relay-ip=109.238.92.48
# Разрешить реле для любых IP
allowed-peer-ip=0.0.0.0-255.255.255.255
# Или попробуйте указать конкретные диапазоны, если выше не работает:
# allowed-peer-ip=109.238.92.48
# allowed-peer-ip=192.168.0.0/16

# Отключение проверок, которые могут вызывать 403
no-loopback-peers

