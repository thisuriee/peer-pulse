"use strict";

const { BookingController } = require("./session.controller");
const { BookingService } = require("./session.service");
const { AvailabilityService } = require("./availability.service");

const bookingService = new BookingService();
const availabilityService = new AvailabilityService();
const bookingController = new BookingController(bookingService, availabilityService);

module.exports = { bookingService, availabilityService, bookingController };