"use strict";

const jwt = require("jsonwebtoken");
const { config } = require("../../config/app.config");
const { logger } = require("./logger-utils");

const defaults = {
  audience: ["user"],
};

const accessTokenSignOptions = {
  expiresIn: config.JWT.EXPIRES_IN,
  secret: config.JWT.SECRET,
};

const refreshTokenSignOptions = {
  expiresIn: config.JWT.REFRESH_EXPIRES_IN,
  secret: config.JWT.REFRESH_SECRET,
};

const signJwtToken = (payload, options) => {
  const { secret, ...opts } = options || accessTokenSignOptions;
  return jwt.sign(payload, secret, {
    ...defaults,
    ...opts,
  });
};

const verifyJwtToken = (token, options) => {
  try {
    const { secret = config.JWT.SECRET, ...opts } = options || {};
    const payload = jwt.verify(token, secret, {
      ...defaults,
      ...opts,
    });
    return { payload };
  } catch (err) {
    logger.warn("JWT verification failed", { error: err?.message });
    return {
      error: err.message,
    };
  }
};

module.exports = {
  accessTokenSignOptions,
  refreshTokenSignOptions,
  signJwtToken,
  verifyJwtToken,
};
