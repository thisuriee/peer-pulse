import mongoose from "mongoose";
import { config } from "../config/app.config";
import { logger } from "../common/utils/logger-utils";

const connectDatabase = async () => {
  try {
    await mongoose.connect(config.MONGO_URI);
    logger.info("Connected to Mongo database");
  } catch (error) {
    logger.error("Error connecting to Mongo database", { error });
    process.exit(1);
  }
};

export default connectDatabase;
