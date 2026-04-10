const { ThreadModel } = require("../../../src/database/models/thread.model");
const { ThreadService } = require("../../../src/modules/thread/thread.service");
const {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} = require("../../../src/common/utils/errors-utils");
const { ProfanityFilter } = require("../../../src/common/utils/profanity-filter.utils");
const { logger } = require("../../../src/common/utils/logger-utils");

jest.mock("../../../src/database/models/thread.model");
jest.mock("../../../src/common/utils/profanity-filter.utils");
jest.mock("../../../src/common/utils/logger-utils", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe("ThreadService", () => {
  let threadService;

  beforeEach(() => {
    threadService = new ThreadService();
    jest.clearAllMocks();
  });

  describe("createThread", () => {
    const authorId = "user123";
    const threadData = {
      title: "Test Thread",
      content: "This is a test thread",
      subject: "Math",
      assignedTutor: "tutor123",
    };

    it("should successfully create a thread when content is safe", async () => {
      ProfanityFilter.analyzeText.mockResolvedValue({ toxicity: 0.1 });
      
      const mockThread = {
        _id: "thread123",
        ...threadData,
        authorId,
        populate: jest.fn().mockResolvedValue(true),
      };
      
      ThreadModel.create.mockResolvedValue(mockThread);

      const result = await threadService.createThread(authorId, threadData);

      expect(ProfanityFilter.analyzeText).toHaveBeenCalledTimes(2);
      expect(ThreadModel.create).toHaveBeenCalledWith({
        authorId,
        title: threadData.title,
        content: threadData.content,
        subject: threadData.subject,
        assignedTutor: threadData.assignedTutor,
        flaggedForReview: false,
        moderation: { toxicityScore: 0.1 },
      });
      expect(logger.info).toHaveBeenCalled();
    });

    it("should throw BadRequestException when content is toxic", async () => {
      process.env.PERSPECTIVE_TOXICITY_THRESHOLD = "0.7";
      ProfanityFilter.analyzeText.mockResolvedValue({ toxicity: 0.9 });

      await expect(threadService.createThread(authorId, threadData)).rejects.toThrow(BadRequestException);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("Blocked thread"), expect.any(Object));
    });
  });

  describe("getThreads", () => {
    it("should return paginated threads with default sorting", async () => {
      const filters = { page: 1, limit: 10 };
      const mockThreads = [{ title: "Thread 1" }];
      
      ThreadModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockThreads),
      });
      ThreadModel.countDocuments.mockResolvedValue(1);

      const result = await threadService.getThreads(filters);

      expect(result.threads).toEqual(mockThreads);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
    });

    it("should handle mostUpvoted sorting using aggregation", async () => {
      const filters = { sort: "mostUpvoted", limit: 5 };
      const aggResults = [{ title: "Agg Thread" }];
      
      ThreadModel.aggregate.mockResolvedValue(aggResults);
      ThreadModel.countDocuments.mockResolvedValue(1);
      ThreadModel.populate.mockResolvedValue(aggResults);

      const result = await threadService.getThreads(filters);

      expect(ThreadModel.aggregate).toHaveBeenCalled();
      expect(ThreadModel.populate).toHaveBeenCalledWith(aggResults, expect.any(Array));
      expect(result.threads).toEqual(aggResults);
    });
  });

  describe("getThreadById", () => {
    const threadId = "thread123";

    it("should return a thread if found", async () => {
      const mockThread = {
        _id: threadId,
        isDeleted: false,
        replies: [{ _id: "r1", isDeleted: false }, { _id: "r2", isDeleted: true }],
        comments: [{ _id: "c1", isDeleted: false }, { _id: "c2", isDeleted: true }],
        toObject: function() { return { ...this }; }
      };

      ThreadModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockThread),
        lean: jest.fn().mockReturnThis(),
        then: jest.fn((cb) => cb(mockThread))
      });

      const result = await threadService.getThreadById(threadId);

      expect(result._id).toBe(threadId);
      expect(result.replies.length).toBe(1);
      expect(result.comments.length).toBe(1);
    });

    it("should throw NotFoundException if thread is not found", async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
        then: jest.fn((cb) => cb(null))
      };
      ThreadModel.findOne.mockReturnValue(mockQuery);

      await expect(threadService.getThreadById(threadId)).rejects.toThrow(NotFoundException);
    });
  });

  describe("updateThread", () => {
    const threadId = "t1";
    const userId = "u1";

    it("should update a thread successfully", async () => {
      const mockThread = {
        _id: threadId,
        authorId: userId,
        flaggedForReview: false,
        save: jest.fn(),
        populate: jest.fn().mockResolvedValue(true)
      };

      ThreadModel.findOne.mockResolvedValue(mockThread);
      ProfanityFilter.shouldFlag.mockResolvedValue(false);

      await threadService.updateThread(threadId, userId, { title: "New Title", content: "New Content" });

      expect(mockThread.title).toBe("New Title");
      expect(mockThread.content).toBe("New Content");
      expect(mockThread.save).toHaveBeenCalled();
    });

    it("should throw ForbiddenException if user is not the author", async () => {
      ThreadModel.findOne.mockResolvedValue({ authorId: "otherUser" });

      await expect(threadService.updateThread(threadId, userId, {})).rejects.toThrow(ForbiddenException);
    });

    it("should throw BadRequestException if new content is toxic", async () => {
      ThreadModel.findOne.mockResolvedValue({ authorId: userId });
      ProfanityFilter.shouldFlag.mockResolvedValue(true);

      await expect(threadService.updateThread(threadId, userId, { title: "Toxic" })).rejects.toThrow(BadRequestException);
    });
  });

  describe("deleteThread", () => {
    it("should soft delete a thread as author", async () => {
      const mockThread = { authorId: "u1", save: jest.fn() };
      ThreadModel.findById.mockResolvedValue(mockThread);

      await threadService.deleteThread("t1", "u1", "user");

      expect(mockThread.isDeleted).toBe(true);
      expect(mockThread.save).toHaveBeenCalled();
    });

    it("should soft delete a thread as admin", async () => {
      const mockThread = { authorId: "otherUser", save: jest.fn() };
      ThreadModel.findById.mockResolvedValue(mockThread);

      await threadService.deleteThread("t1", "u1", "admin");

      expect(mockThread.isDeleted).toBe(true);
    });

    it("should throw ForbiddenException if not author and not admin", async () => {
      ThreadModel.findById.mockResolvedValue({ authorId: "otherUser" });

      await expect(threadService.deleteThread("t1", "u1", "user")).rejects.toThrow(ForbiddenException);
    });
  });

  describe("Voting (Thread)", () => {
    const threadId = "t1";
    const userId = "u1";

    it("should toggle upvote", async () => {
      const mockThread = { upvotes: ["u1"], save: jest.fn() };
      ThreadModel.findOne.mockResolvedValue(mockThread);

      const result = await threadService.toggleUpvote(threadId, userId);

      expect(mockThread.upvotes).not.toContain("u1"); // removed
      expect(result.upvoted).toBe(false);

      mockThread.upvotes = [];
      const result2 = await threadService.toggleUpvote(threadId, userId);
      expect(mockThread.upvotes).toContain("u1"); // added
      expect(result2.upvoted).toBe(true);
    });

    it("should toggle downvote and remove upvote if exists", async () => {
      const mockThread = { upvotes: ["u1"], downvotes: [], save: jest.fn() };
      ThreadModel.findOne.mockResolvedValue(mockThread);

      const result = await threadService.toggleDownvote(threadId, userId);

      expect(mockThread.upvotes).not.toContain("u1");
      expect(mockThread.downvotes).toContain(userId);
      expect(result.downvoted).toBe(true);
    });
  });
});
