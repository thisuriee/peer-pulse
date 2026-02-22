"use strict";

const { z } = require("zod");

const createThreadSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "Title must be at least 5 characters")
    .max(200, "Title cannot exceed 200 characters"),
  content: z
    .string()
    .trim()
    .min(10, "Content must be at least 10 characters")
    .max(5000, "Content cannot exceed 5000 characters"),
  subject: z.string().trim().max(100).optional(),
});

const updateThreadSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "Title must be at least 5 characters")
    .max(200, "Title cannot exceed 200 characters")
    .optional(),
  content: z
    .string()
    .trim()
    .min(10, "Content must be at least 10 characters")
    .max(5000, "Content cannot exceed 5000 characters")
    .optional(),
  subject: z.string().trim().max(100).optional(),
});

const createReplySchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Reply text is required")
    .max(2000, "Reply cannot exceed 2000 characters"),
});

const threadQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  subject: z.string().trim().optional(),
  sort: z.enum(["latest", "mostUpvoted"]).optional().default("latest"),
});

module.exports = {
  createThreadSchema,
  updateThreadSchema,
  createReplySchema,
  threadQuerySchema,
};