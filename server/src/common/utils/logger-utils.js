"use strict";

const { createLogger, format, transports } = require("winston");
require("winston-daily-rotate-file");
const { config } = require("../../config/app.config");
const { Logtail } = require("@logtail/node");
const { LogtailTransport } = require("@logtail/winston");

const logtailToken = process.env.LOGTAIL_SOURCE_TOKEN || "";
const logtailIngest = process.env.LOGTAIL_INGEST_ENDPOINT || undefined;
let logtailClient;
if (logtailToken) {
  logtailClient = new Logtail(logtailToken, logtailIngest ? { endpoint: logtailIngest } : undefined);
}

const SENSITIVE_KEYS = [
  "password", "pass", "pwd", "token", "accessToken", "refreshToken", "authorization", "cookie"
];

function redactSensitive(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(redactSensitive);
  return Object.keys(obj).reduce((acc, key) => {
    if (SENSITIVE_KEYS.includes(key)) {
      acc[key] = "[REDACTED]";
    } else if (typeof obj[key] === "object" && obj[key] !== null) {
      acc[key] = redactSensitive(obj[key]);
    } else {
      acc[key] = obj[key];
    }
    return acc;
  }, {});
}

function getDefaultMeta() {
  return {
    service: process.env.APP_NAME || "authly-backend",
    env: config.NODE_ENV || process.env.NODE_ENV || "development",
    reqId: global.currentReqId || undefined,
  };
}

const timestampFormat = format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" });

const redactFormat = format((info) => {
  if (info && typeof info === "object") {
    if (info.meta) info.meta = redactSensitive(info.meta);
    else {
      Object.keys(info).forEach((key) => {
        if (!["level", "message", "timestamp"].includes(key)) {
          info[key] = redactSensitive(info[key]);
        }
      });
    }
  }
  return info;
});

const devFormat = format.combine(
  format.colorize({ all: true }),
  timestampFormat,
  redactFormat(),
  format.printf(({ level, message, timestamp, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : "";
    return `\x1b[1m${timestamp}\x1b[0m [${level}] \x1b[36m${message}\x1b[0m ${metaStr}`;
  })
);

const prodFormat = format.combine(
  timestampFormat,
  format.errors({ stack: true }),
  redactFormat(),
  format.printf(({ level, message, timestamp, stack, ...meta }) => {
    const base = {
      timestamp,
      level,
      message,
      ...(stack ? { stack } : {}),
      ...meta
    };
    return JSON.stringify(base, null, 2);
  })
);

const isProd = config.NODE_ENV === "production" || process.env.NODE_ENV === "production";

// Base logger config
const logger = createLogger({
  level: config.NODE_ENV === "production" ? "info" : "debug",
  defaultMeta: getDefaultMeta(),
  format: isProd ? prodFormat : devFormat,
  transports: [],
  exitOnError: false,
});

logger.add(
  new transports.Console({
    level: isProd ? "info" : "debug",
    stderrLevels: ["error"],
  })
);

// Daily rotating file for persisted logs (keeps dev / local logs)
try {
  const DailyRotateFile = require("winston-daily-rotate-file");
  logger.add(
    new DailyRotateFile({
      level: "debug",
      dirname: "logs",
      filename: "%DATE%-app.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "14d",
      zippedArchive: true,
    })
  );
} catch (err) {
  // if the rotate transport isn't available, silently continue
  logger.warn("winston-daily-rotate-file not available, skipping file transport");
}

// Attach Logtail transport only in production and if client is configured
if (isProd && logtailClient) {
  try {
    logger.add(new LogtailTransport(logtailClient));
  } catch (err) {
    logger.error("Failed to attach Logtail transport", { err });
  }
}

// Handle uncaught exceptions and rejections via Winston
logger.exceptions.handle(new transports.Console());
logger.rejections.handle(new transports.Console());

const flushLogs = async () => {
  if (logtailClient && typeof logtailClient.flush === "function") {
    try {
      await logtailClient.flush();
    } catch (err) {
      logger.warn("Logtail flush failed", { err });
    }
  }
};

const closeLogger = async () => {
  try {
    logger.on("finish", () => {});
    logger.end();
  } catch (err) {}
};

module.exports = { logger, flushLogs, closeLogger };
