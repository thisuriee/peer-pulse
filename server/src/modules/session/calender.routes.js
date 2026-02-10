"use strict";

const { Router } = require("express");
const { google } = require("googleapis");
const { config } = require("../../config/app.config");
const { logger } = require("../../common/utils/logger-utils");

const calendarAuthRoutes = Router();

/**
 * Step 1: Redirect user to Google OAuth consent screen for Calendar access
 * GET /api/v1/auth/google/calendar
 */
calendarAuthRoutes.get("/google/calendar", (req, res) => {
  const oauth2Client = new google.auth.OAuth2(
    config.GOOGLE_CLIENT_ID,
    config.GOOGLE_CLIENT_SECRET,
    config.GOOGLE_REDIRECT_URI
  );

  const scopes = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events",
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent", // Force to get refresh token
  });

  res.redirect(authUrl);
});

/**
 * Step 2: Google redirects here with authorization code
 * GET /api/v1/auth/google/calendar/callback
 */
calendarAuthRoutes.get("/google/calendar/callback", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: "Authorization code not provided" });
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      config.GOOGLE_CLIENT_ID,
      config.GOOGLE_CLIENT_SECRET,
      config.GOOGLE_REDIRECT_URI
    );

    const { tokens } = await oauth2Client.getToken(code);

    logger.info("Google Calendar tokens received", {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
    });

    // Display the refresh token - YOU NEED TO SAVE THIS TO YOUR .env FILE
    res.status(200).json({
      message: "Success! Copy the refresh_token below to your .env file",
      instructions: [
        "1. Copy the refresh_token value below",
        "2. Add it to your server/.env file as: GOOGLE_REFRESH_TOKEN=<paste_here>",
        "3. Restart your server",
      ],
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token, // <-- SAVE THIS!
        expiry_date: tokens.expiry_date,
      },
    });
  } catch (error) {
    logger.error("Failed to get Google Calendar tokens", { error: error.message });
    res.status(500).json({
      error: "Failed to get tokens",
      message: error.message,
    });
  }
});

module.exports = calendarAuthRoutes;