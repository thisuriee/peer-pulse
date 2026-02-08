import "dotenv/config";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import cookieParser from "cookie-parser";
import { config } from "./config/app.config";
import connectDatabase from "./database/database";
import { errorHandler } from "./middlewares/core/error-handler.middleware";
import { HTTPSTATUS } from "./config/http.config";
import { asyncHandler } from "./middlewares/helpers/async-handler.middleware";
import authRoutes from "./modules/auth/auth.routes";
import passport from "./middlewares/auth/passport.middleware";
import sessionRoutes from "./modules/session/session.routes";
import { authenticateJWT } from "./common/strategies/jwt.strategy";
import mfaRoutes from "./modules/mfa/mfa.routes";
import { logger, flushLogs } from "./common/utils/logger-utils";
import { requestIdMiddleware } from "./middlewares/core/request-id.middleware";
import { requestLoggerMiddleware } from "./middlewares/core/request-logger.middleware";
import { globalRateLimiter } from "./middlewares/core/rate-limit.middleware";
import swaggerUi from "swagger-ui-express";
import fs from "fs";
import path from "path";

const app = express();
const BASE_PATH = config.BASE_PATH;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:5173"],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(requestIdMiddleware);
app.use(requestLoggerMiddleware);
app.use(globalRateLimiter);
app.use(passport.initialize());

// Swagger UI setup
if (process.env.SWAGGER_UI_ENABLED === "true") {
  const openApiPath = path.join(__dirname, "docs/openapi.yml");
  if (fs.existsSync(openApiPath)) {
    const yaml = require("js-yaml");
    const openApiSpec = yaml.load(fs.readFileSync(openApiPath, "utf8"));
    app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));
    logger.info("Swagger UI enabled at /docs");
  } else {
    logger.warn("OpenAPI spec not found, Swagger UI not mounted");
  }
}

app.get(
  "/",
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    res.status(HTTPSTATUS.OK).json({
      message: "Welcome to the Authly API",
      env: config.NODE_ENV,
    });
  })
);

app.use(`${BASE_PATH}/auth`, authRoutes);

app.use(`${BASE_PATH}/mfa`, mfaRoutes);

app.use(`${BASE_PATH}/session`, authenticateJWT, sessionRoutes);

app.use(errorHandler);

const server = app.listen(config.PORT, async () => {
  logger.info(`Server starting on port ${config.PORT} in ${config.NODE_ENV}`);
  await connectDatabase();
  logger.info("Database connected");
});

const gracefulShutdown = async (signal: string) => {
  try {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    server.close(async (err) => {
      if (err) {
        logger.error("Error closing server", { err });
        process.exit(1);
      }
      try {
        await flushLogs();
      } catch (e) {
        // ignore
      }
      logger.info("Shutdown complete");
      process.exit(0);
    });
  } catch (err) {
    logger.error("Failed during graceful shutdown", { err });
    process.exit(1);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("unhandledRejection", async (reason) => {
  logger.error("Unhandled Rejection", { reason });
  await flushLogs();
});
process.on("uncaughtException", async (err) => {
  logger.error("Uncaught Exception", { err });
  await flushLogs();
  process.exit(1);
});
