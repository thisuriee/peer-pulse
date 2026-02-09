"use strict";

const { v4: uuidv4 } = require("uuid");

function generateUniqueCode() {
  return uuidv4().replace(/-/g, "").substring(0, 25);
}

module.exports = { generateUniqueCode };
