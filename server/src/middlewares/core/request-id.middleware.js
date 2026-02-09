"use strict";

const { v4: uuidv4 } = require("uuid");

function requestIdMiddleware(req, res, next) {
  const reqId = req.headers["x-request-id"] || uuidv4();
  req.reqId = reqId;
  global.currentReqId = reqId;
  res.setHeader("X-Request-Id", reqId);
  next();
}

module.exports = { requestIdMiddleware };
