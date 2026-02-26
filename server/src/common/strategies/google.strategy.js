"use strict";

const GoogleStrategy = require("passport-google-oauth20").Strategy;
const passport = require("passport");
const { config } = require("../../config/app.config");
const UserModel = require("../../database/models/user.model");
const { logger } = require("../utils/logger-utils");

const setupGoogleStrategy = () => {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.GOOGLE_CLIENT_ID,
        clientSecret: config.GOOGLE_CLIENT_SECRET,
        callbackURL: config.GOOGLE_CALLBACK_URL,
        scope: ["profile", "email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails[0].value;
          
          // Check if user exists
          let user = await UserModel.findOne({ email });

          if (!user) {
            // Create new user
            user = await UserModel.create({
              name: profile.displayName,
              email,
              googleId: profile.id,
            });
            logger.info("New user registered via Google OAuth", { userId: user._id, email });
          } else if (!user.googleId) {
            // Link Google account to existing user
            user.googleId = profile.id;
            await user.save();
            logger.info("Linked Google account to existing user", { userId: user._id });
          }

          return done(null, user);
        } catch (error) {
          logger.error("Google OAuth error", { error: error.message });
          return done(error, null);
        }
      }
    )
  );
};

module.exports = { setupGoogleStrategy };
