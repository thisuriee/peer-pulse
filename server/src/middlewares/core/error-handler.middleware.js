"use strict";

const { z } = require("zod");
const { HTTPSTATUS } = require("../../config/http.config");
const { AppError } = require("../../common/utils/error-utils");
const {
  clearAuthenticationCookies,
  REFRESH_PATH,
} = require("../../common/utils/cookie-utils");
const { logger } = require("../../common/utils/logger-utils");

const formatZodError = (res, error) => {
  const errors = error?.issues?.map((err) => ({
    field: err.path.join("."),
    message: err.message,
  }));
  return res.status(HTTPSTATUS.BAD_REQUEST).json({
    message: "Validation failed",
    errors: errors,
  });
};

const errorHandler = (error, req, res, next) => {
  logger.error("Error occured on PATH", { path: req.path, error });

  if (req.path === REFRESH_PATH) {
    clearAuthenticationCookies(res);
  }

  if (error instanceof SyntaxError) {
    return res.status(HTTPSTATUS.BAD_REQUEST).json({
      message: "Invalid JSON format, please check your request body",
    });
  }

  if (error instanceof z.ZodError) {
    return formatZodError(res, error);
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      message: error.message,
      errorCode: error.errorCode,
    });
  }

  return res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json({
    message: "Internal Server Error",
    error: error?.message || "Unknown error occurred",
  });
};

module.exports = { errorHandler };
