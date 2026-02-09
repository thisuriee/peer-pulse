"use strict";

const { add } = require("date-fns");

const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

const thirtyDaysFromNow = () =>
  new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

const fortyFiveMinutesFromNow = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 45);
  return now;
};

const tenMinutesAgo = () => new Date(Date.now() - 10 * 60 * 1000);

const threeMinutesAgo = () => new Date(Date.now() - 3 * 60 * 1000);

const anHourFromNow = () => new Date(Date.now() + 60 * 60 * 1000);

const calculateExpirationDate = (expiresIn = "15m") => {
  // Match number + unit (m = minutes, h = hours, d = days)
  const match = expiresIn.match(/^(\d+)([mhd])$/);
  if (!match) throw new Error('Invalid format. Use "15m", "1h", or "2d".');
  const [, value, unit] = match;
  const expirationDate = new Date();

  // Check the unit and apply accordingly
  switch (unit) {
    case "m": // minutes
      return add(expirationDate, { minutes: parseInt(value) });
    case "h": // hours
      return add(expirationDate, { hours: parseInt(value) });
    case "d": // days
      return add(expirationDate, { days: parseInt(value) });
    default:
      throw new Error('Invalid unit. Use "m", "h", or "d".');
  }
};

module.exports = {
  ONE_DAY_IN_MS,
  thirtyDaysFromNow,
  fortyFiveMinutesFromNow,
  tenMinutesAgo,
  threeMinutesAgo,
  anHourFromNow,
  calculateExpirationDate,
};
