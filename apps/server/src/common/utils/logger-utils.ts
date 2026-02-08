import { createLogger, format, transports, Logger } from "winston";
import "winston-daily-rotate-file";
import { config } from "../../config/app.config";
import { Logtail } from "@logtail/node";
import { LogtailTransport } from "@logtail/winston";

const logtailToken = process.env.LOGTAIL_SOURCE_TOKEN || "";
const logtailIngest = process.env.LOGTAIL_INGEST_ENDPOINT || undefined;
let logtailClient: Logtail | undefined;
if (logtailToken) {
  logtailClient = new Logtail(logtailToken, logtailIngest ? { endpoint: logtailIngest } : undefined);
}

const SENSITIVE_KEYS = [
  "password", "pass", "pwd", "token", "accessToken", "refreshToken", "authorization", "cookie"
];

function redactSensitive(obj: any): any {
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
  }, {} as any);
}

function getDefaultMeta() {
  return {
  service: process.env.APP_NAME || "authly-backend",
    env: config.NODE_ENV || process.env.NODE_ENV || "development",
    reqId: (global as any).currentReqId || undefined,
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
    return JSON.stringify(base, null, 2); // pretty-print JSON
  })
);

const isProd = config.NODE_ENV === "production" || process.env.NODE_ENV === "production";

// Base logger config
const logger: Logger = createLogger({
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
  // require the module to avoid TS import issues
  // @ts-ignore
  const DailyRotateFile = require("winston-daily-rotate-file").DailyRotateFile;
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

// Exported helpers
export { logger };

export const flushLogs = async (): Promise<void> => {
  if (logtailClient && typeof (logtailClient as any).flush === "function") {
    try {
      // @ts-ignore
      await logtailClient.flush();
    } catch (err) {
      logger.warn("Logtail flush failed", { err });
    }
  }
};

export const closeLogger = async (): Promise<void> => {
  try {
    logger.on("finish", () => {});
    logger.end();
  } catch (err) {}
};

