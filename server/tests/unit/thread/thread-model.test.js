const mongoose = require("mongoose");
const { ThreadModel } = require("../../../src/database/models/thread.model");

describe("Thread Model Validation", () => {
  const validThreadData = {
    authorId: new mongoose.Types.ObjectId(),
    title: "How to reverse a linked list?",
    content: "I am having trouble understanding how to reverse a linked list in JavaScript. Can someone help?",
    subject: "Computer Science"
  };

  it("should validate successfully with required fields", () => {
    const thread = new ThreadModel(validThreadData);
    const error = thread.validateSync();
    expect(error).toBeUndefined();
  });

  it("should invalidate when required fields are missing", () => {
    const thread = new ThreadModel({});
    const error = thread.validateSync();
    
    expect(error.errors["authorId"]).toBeDefined();
    expect(error.errors["title"]).toBeDefined();
    expect(error.errors["content"]).toBeDefined();
  });

  it("should invalidate when title exceeds maximum length", () => {
    const thread = new ThreadModel({
      ...validThreadData,
      title: "a".repeat(201)
    });
    const error = thread.validateSync();
    expect(error.errors["title"]).toBeDefined();
    expect(error.errors["title"].kind).toBe("maxlength");
  });

  it("should invalidate when content exceeds maximum length", () => {
    const thread = new ThreadModel({
      ...validThreadData,
      content: "a".repeat(5001)
    });
    const error = thread.validateSync();
    expect(error.errors["content"]).toBeDefined();
    expect(error.errors["content"].kind).toBe("maxlength");
  });

  it("should set default values correctly", () => {
    const thread = new ThreadModel(validThreadData);
    expect(thread.assignedTutor).toBeNull();
    expect(thread.isResolved).toBe(false);
    expect(thread.flaggedForReview).toBe(false);
    expect(thread.isDeleted).toBe(false);
    expect(thread.upvotes).toEqual([]);
    expect(thread.downvotes).toEqual([]);
    expect(thread.replies).toEqual([]);
    expect(thread.comments).toEqual([]);
  });

  it("should correctly calculate upvoteCount virtual property", () => {
    const thread = new ThreadModel({
      ...validThreadData,
      upvotes: [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()]
    });
    expect(thread.upvoteCount).toBe(2);
  });

  it("should correctly calculate replyCount virtual property, ignoring deleted replies", () => {
    const thread = new ThreadModel({
      ...validThreadData,
      replies: [
        {
          userId: new mongoose.Types.ObjectId(),
          text: "Reply 1",
          isDeleted: false
        },
        {
          userId: new mongoose.Types.ObjectId(),
          text: "Reply 2",
          isDeleted: true
        }
      ]
    });
    expect(thread.replyCount).toBe(1);
  });

  describe("Subdocuments", () => {
    it("should validate an embedded reply document", () => {
      const thread = new ThreadModel({
        ...validThreadData,
        replies: [{ userId: new mongoose.Types.ObjectId(), text: "This is a reply." }]
      });
      const error = thread.validateSync();
      expect(error).toBeUndefined();
    });

    it("should invalidate a reply missing required fields", () => {
      const thread = new ThreadModel({
        ...validThreadData,
        replies: [{}] // missing userId and text
      });
      const error = thread.validateSync();
      expect(error.errors["replies.0.userId"]).toBeDefined();
      expect(error.errors["replies.0.text"]).toBeDefined();
    });
  });
});
