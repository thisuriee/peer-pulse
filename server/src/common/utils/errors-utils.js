"use strict";

const { HTTPSTATUS } = require("../../config/http.config");
const { ErrorCode } = require("../enums/error-code.enum");
const { AppError } = require("./error-utils");

class NotFoundException extends AppError {
  constructor(message = "Resource not found", errorCode) {
    super(
      message,
      HTTPSTATUS.NOT_FOUND,
      errorCode || ErrorCode.RESOURCE_NOT_FOUND
    );
  }
}

class BadRequestException extends AppError {
  constructor(message = "Bad Request", errorCode) {
    super(message, HTTPSTATUS.BAD_REQUEST, errorCode);
  }
}

class UnauthorizedException extends AppError {
  constructor(message = "Unauthorized Access", errorCode) {
    super(
      message,
      HTTPSTATUS.UNAUTHORIZED,
      errorCode || ErrorCode.ACCESS_UNAUTHORIZED
    );
  }
}

class InternalServerException extends AppError {
  constructor(message = "Internal Server Error", errorCode) {
    super(
      message,
      HTTPSTATUS.INTERNAL_SERVER_ERROR,
      errorCode || ErrorCode.INTERNAL_SERVER_ERROR
    );
  }
}

class HttpException extends AppError {
  constructor(
    message = "Http Exception Error",
    statusCode,
    errorCode
  ) {
    super(message, statusCode, errorCode);
  }
}

module.exports = {
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  InternalServerException,
  HttpException,
};
