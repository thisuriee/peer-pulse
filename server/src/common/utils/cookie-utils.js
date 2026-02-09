"use strict";

const { config } = require("../../config/app.config");
const { calculateExpirationDate } = require("./date-utils");

const REFRESH_PATH = `${config.BASE_PATH}/auth/refresh`;

const defaults = {
  httpOnly: true,
  //secure: config.NODE_ENV === "production" ? true : false,
  //sameSite: config.NODE_ENV === "production" ? "strict" : "lax",
};

const getRefreshTokenCookieOptions = () => {
  const expiresIn = config.JWT.REFRESH_EXPIRES_IN;
  const expires = calculateExpirationDate(expiresIn);
  return {
    ...defaults,
    expires,
    path: REFRESH_PATH,
  };
};

const getAccessTokenCookieOptions = () => {
  const expiresIn = config.JWT.EXPIRES_IN;
  const expires = calculateExpirationDate(expiresIn);
  return {
    ...defaults,
    expires,
    path: "/",
  };
};

const setAuthenticationCookies = ({ res, accessToken, refreshToken }) =>
  res
    .cookie("accessToken", accessToken, getAccessTokenCookieOptions())
    .cookie("refreshToken", refreshToken, getRefreshTokenCookieOptions());

const clearAuthenticationCookies = (res) =>
  res.clearCookie("accessToken").clearCookie("refreshToken", {
    path: REFRESH_PATH,
  });

module.exports = {
  REFRESH_PATH,
  getRefreshTokenCookieOptions,
  getAccessTokenCookieOptions,
  setAuthenticationCookies,
  clearAuthenticationCookies,
};
