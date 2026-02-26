"use strict";

const { z } = require("zod");

const emailSchema = z.string().trim().email().min(1).max(255);
const passwordSchema = z.string().trim().min(6).max(255);
const verificationCodeSchema = z.string().trim().min(1).max(25);

const registerSchema = z
  .object({
    name: z.string().trim().min(1).max(255),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: passwordSchema,
    role: z.enum(["student", "tutor"]).optional().default("student"),
  })
  .refine((val) => val.password === val.confirmPassword, {
    message: "Password does not match",
    path: ["confirmPassword"],
  });

const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  userAgent: z.string().optional(),
});

const verificationEmailSchema = z.object({
  code: verificationCodeSchema,
});

const resetPasswordSchema = z.object({
  password: passwordSchema,
  verificationCode: verificationCodeSchema,
});

module.exports = {
  emailSchema,
  passwordSchema,
  verificationCodeSchema,
  registerSchema,
  loginSchema,
  verificationEmailSchema,
  resetPasswordSchema,
};
