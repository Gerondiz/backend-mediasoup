// logger.js
const { createLogger, format, transports } = require('winston');
const config = require('../config');

// Функция для получения времени по Московскому часовому поясу
const MoscowTimeFormat = () => {
  const now = new Date();
  // Москва: UTC+3
  const moscowTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + (3 * 3600000));
  // Формат: YYYY-MM-DD HH:mm:ss.SSS [MSK]
  const year = moscowTime.getUTCFullYear();
  const month = String(moscowTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(moscowTime.getUTCDate()).padStart(2, '0');
  const hours = String(moscowTime.getUTCHours()).padStart(2, '0');
  const minutes = String(moscowTime.getUTCMinutes()).padStart(2, '0');
  const seconds = String(moscowTime.getUTCSeconds()).padStart(2, '0');
  const milliseconds = String(moscowTime.getUTCMilliseconds()).padStart(3, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds} [MSK]`;
};

const logger = createLogger({
  level: config.logging.level,
  format: format.combine(
    // Добавляем timestamp в ISO формате для файлов (если нужно), но переопределим в printf
    format.timestamp(),
    format.errors({ stack: true }),
    format.json() // Формат для файлов
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.timestamp(), // winston добавит timestamp к объекту
        format.printf(({ level, message, timestamp }) => {
          // Используем нашу функцию для Московского времени в консоли
          const readableTime = MoscowTimeFormat(); // Вызываем функцию для получения времени
          // Выводим: [ВРЕМЯ MSK] [УРОВЕНЬ]: СООБЩЕНИЕ
          return `[${readableTime}] [${level}]: ${message}`;
        })
      )
    }),
    new transports.File({
      filename: 'logs/error.log',
      level: 'error' // Этот файл будет содержать только error и выше
    }),
    new transports.File({
      filename: 'logs/combined.log'
      // Этот файл будет содержать все уровни, установленные в createLogger (debug и выше)
      // Формат для файлов (JSON) определен в createLogger.format
    })
  ]
});

module.exports = logger;