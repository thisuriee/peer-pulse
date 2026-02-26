"use strict";

const { ThreadController } = require("./thread.controller");
const { ThreadService } = require("./thread.service");

const threadService = new ThreadService();
const threadController = new ThreadController(threadService);

module.exports = { threadService, threadController };