"use strict";

require("dotenv/config");
const cors = require("cors");
const express = require("express");
const cookieParser = require("cookie-parser");
const passport = require("passport");
const { config } = require("./config/app.config");
const connectDatabase = require("./database/database");
const { errorHandler } = require("./middlewares/core/error-handler.middleware");
const { HTTPSTATUS } = require("./config/http.config");
const { asyncHandler } = require("./middlewares/helpers/async-handler.middleware");
const { logger, flushLogs } = require("./common/utils/logger-utils");
const { requestIdMiddleware } = require("./middlewares/core/request-id.middleware");
const { requestLoggerMiddleware } = require("./middlewares/core/request-logger.middleware");
const { globalRateLimiter } = require("./middlewares/core/rate-limit.middleware");
const { setupGoogleStrategy } = require("./common/strategies/google.strategy");
const swaggerUi = require("swagger-ui-express");
const fs = require("fs");
const path = require("path");

// Import routes
const authRoutes = require("./modules/auth/auth.routes");
const sessionRoutes = require("./modules/session/session.routes");
const resourceRoutes = require("./modules/resource/resource.routes");
const reviewRoutes = require("./modules/review/review.routes");
const threadRoutes = require("./modules/thread/thread.routes");
const bookingRoutes = require("./modules/session/session.routes");
const calendarAuthRoutes =  require("./modules/session/calender.routes");

// Import shared middleware
const { authenticateJWT } = require("./common/middleware/auth.middleware");

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

// Initialize Passport for Google OAuth
app.use(passport.initialize());
setupGoogleStrategy();

app.use(requestIdMiddleware);
app.use(requestLoggerMiddleware);
app.use(globalRateLimiter);

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
  asyncHandler(async (req, res, next) => {
    res.status(HTTPSTATUS.OK).json({
      message: "Welcome to Peer-Pulse API",
      env: config.NODE_ENV,
    });
  })
);

// ============================================
// API Routes
// ============================================

// Auth routes (shared authentication service)
app.use(`${BASE_PATH}/auth`, authRoutes);

// Calendar OAuth routes (for getting refresh token)
app.use(`${BASE_PATH}/auth`, calendarAuthRoutes); 

// Component 1: Session Orchestrator (Dahami) - Booking & Scheduling
app.use(`${BASE_PATH}/sessions`, authenticateJWT, sessionRoutes);

// Component 1: Bookings (New booking system)
app.use(`${BASE_PATH}/bookings`, bookingRoutes);

// Component 2: Knowledge Vault (Imadh) - Resource & Content Management
app.use(`${BASE_PATH}/resources`, resourceRoutes);

// Component 3: Reputation Engine (Aman) - Gamification & Reviews
app.use(`${BASE_PATH}/reviews`, authenticateJWT, reviewRoutes);

// Component 4: Study-Hub (Thisuri) - Community & Discussion
app.use(`${BASE_PATH}/threads`, threadRoutes);

app.use(errorHandler);

const server = app.listen(config.PORT, async () => {
  logger.info(`Server starting on port ${config.PORT} in ${config.NODE_ENV}`);
  await connectDatabase();
  logger.info("Database connected");
});

const gracefulShutdown = async (signal) => {
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
