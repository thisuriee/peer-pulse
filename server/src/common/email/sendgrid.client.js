"use strict";

const sgMail = require("@sendgrid/mail");

const enabled = process.env.SENDGRID_ENABLED === "true";

if (enabled && process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

async function sendEmail({ to, subject, text }) {
  if (!enabled) return;

  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
    // eslint-disable-next-line no-console
    console.log("SendGrid not configured properly");
    return;
  }

  try {
    await sgMail.send({
      to,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject,
      text,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log("SendGrid error:", err.message);
  }
}

module.exports = { sendEmail };
