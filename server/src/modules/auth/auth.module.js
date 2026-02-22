"use strict";

const { AuthController } = require("./auth.controller");
const { AuthService } = require("./auth.service");

const authService = new AuthService();
const authController = new AuthController(authService);

module.exports = { authService, authController };
