const {
  createThreadSchema,
  updateThreadSchema,
  createReplySchema,
  threadQuerySchema,
  createCommentSchema,
  updateCommentSchema,
  commentQuerySchema,
} = require("../../../src/common/validators/thread.validator");

describe("Thread Validators", () => {
  describe("createThreadSchema", () => {
    it("should validate a correct payload", () => {
      const payload = {
        title: "Understanding Node.js Event Loop",
        content: "Could someone explain the phases of the Node.js event loop in detail?",
        subject: "Programming"
      };
      const result = createThreadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("should fail when title is too short", () => {
      const payload = { title: "Node", content: "Valid content string here" };
      const result = createThreadSchema.safeParse(payload);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain("at least 5 characters");
    });

    it("should fail when content is too short", () => {
      const payload = { title: "Valid Title Here", content: "Too short" };
      const result = createThreadSchema.safeParse(payload);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain("at least 10 characters");
    });
  });

  describe("updateThreadSchema", () => {
    it("should validate a correct partial payload", () => {
      const payload = { title: "Updated Valid Title Here" };
      const result = updateThreadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("should fail if provided title is invalid", () => {
      const payload = { title: "" };
      const result = updateThreadSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe("createReplySchema", () => {
    it("should validate a correct payload", () => {
      const payload = { text: "This is a valid reply text." };
      const result = createReplySchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("should fail when reply text is missing or empty string", () => {
      const payload = { text: "   " };
      const result = createReplySchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe("threadQuerySchema", () => {
    it("should apply default values and coerce valid inputs", () => {
      const query = { page: "2", sort: "mostUpvoted" };
      const result = threadQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(10); // default
      expect(result.data.sort).toBe("mostUpvoted");
    });

    it("should fail if sort value is invalid", () => {
      const query = { sort: "invalidSortValue" };
      const result = threadQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });
  });

  describe("createCommentSchema", () => {
    it("should validate a valid comment", () => {
      const payload = { content: "This is my comment." };
      const result = createCommentSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("should fail when content is empty", () => {
      const payload = { content: "" };
      const result = createCommentSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe("updateCommentSchema", () => {
    it("should validate a valid updated comment", () => {
      const payload = { content: "Updated content here." };
      const result = updateCommentSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe("commentQuerySchema", () => {
    it("should apply default values", () => {
      const query = {};
      const result = commentQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    });
  });
});
