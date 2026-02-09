"use strict";

const { HTTPSTATUS } = require("../../config/http.config");
const { ErrorCode } = require("../enums/error-code.enum");

class AppError extends Error {
  constructor(
    message,
    statusCode = HTTPSTATUS.INTERNAL_SERVER_ERROR,
    errorCode
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = { AppError };
