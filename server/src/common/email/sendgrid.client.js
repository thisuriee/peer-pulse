"use strict";

const sgMail = require("@sendgrid/mail");
const { logger } = require("../utils/logger-utils");

const enabled = process.env.SENDGRID_ENABLED === "true";
const hasCredentials = Boolean(
  process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL
);
const isSendgridReady = enabled && hasCredentials;

if (isSendgridReady) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

async function sendEmail({ to, subject, text }) {
  if (!enabled) {
    logger.warn("SendGrid disabled; email skipped", { to, subject });
    return { ok: false, skipped: true, reason: "disabled" };
  }

  if (!isSendgridReady) {
    logger.warn("SendGrid not configured properly", { to, subject });
    return { ok: false, skipped: true, reason: "not_configured" };
  }

  try {
    await sgMail.send({
      to,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject,
      text,
    });
    logger.info("SendGrid email sent", { to, subject });
    return { ok: true };
  } catch (err) {
    logger.warn("SendGrid error", { to, subject, error: err?.message });
    return { ok: false, error: err?.message || "unknown_sendgrid_error" };
  }
}

module.exports = { sendEmail, isSendgridReady };
