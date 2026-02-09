"use strict";

const bcrypt = require("bcrypt");

const hashValue = async (value, saltRounds = 10) =>
  await bcrypt.hash(value, saltRounds);

const compareValue = async (value, hashedValue) =>
  await bcrypt.compare(value, hashedValue);

module.exports = { hashValue, compareValue };
