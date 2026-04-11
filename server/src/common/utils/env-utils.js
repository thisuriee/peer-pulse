"use strict";

/** When `defaultValue` is passed (including ""), missing env returns that default. Omit it for required vars. */
const getEnv = (key, defaultValue) => {
  const value = process.env[key];
  if (value !== undefined) {
    return value;
  }
  if (arguments.length >= 2) {
    return defaultValue;
  }
  throw new Error(`Environment variable ${key} is not set`);
};

module.exports = { getEnv };
