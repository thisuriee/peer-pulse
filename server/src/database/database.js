"use strict";

const mongoose = require("mongoose");
const { config } = require("../config/app.config");
const { logger } = require("../common/utils/logger-utils");

const connectDatabase = async () => {
  try {
    await mongoose.connect(config.MONGO_URI);
    logger.info("Connected to Mongo database");
  } catch (error) {
    logger.error("Error connecting to Mongo database", { error });
    process.exit(1);
  }
};

module.exports = connectDatabase;
