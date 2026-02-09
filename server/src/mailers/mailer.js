"use strict";

const { config } = require("../config/app.config");
const { resend } = require("./resend-client");

const mailer_sender =
  config.NODE_ENV === "development"
    ? `no-reply <onboarding@resend.dev>`
    : `no-reply <${config.MAILER_SENDER}>`;

const sendEmail = async ({
  to,
  from = mailer_sender,
  subject,
  text,
  html,
}) =>
  await resend.emails.send({
    from,
    to: Array.isArray(to) ? to : [to],
    text,
    subject,
    html,
  });

module.exports = { sendEmail };
