const { ThreadController } = require("../../../src/modules/thread/thread.controller");
const { HTTPSTATUS } = require("../../../src/config/http.config");

jest.mock("../../../src/common/validators/thread.validator", () => {
  const mockSchema = { parse: jest.fn(data => data) };
  return {
    createThreadSchema: mockSchema,
    updateThreadSchema: mockSchema,
    createReplySchema: mockSchema,
    threadQuerySchema: mockSchema,
    createCommentSchema: mockSchema,
    updateCommentSchema: mockSchema,
    commentQuerySchema: mockSchema,
  };
});

describe("ThreadController", () => {
  let req, res, next;
  let mockThreadService;
  let threadController;

  beforeEach(() => {
    req = {
      user: { id: "user123", role: "student" },
      body: {},
      params: {},
      query: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();

    mockThreadService = {
      createThread: jest.fn(),
      getThreads: jest.fn(),
      getThreadById: jest.fn(),
      updateThread: jest.fn(),
      deleteThread: jest.fn(),
      toggleUpvote: jest.fn(),
      toggleDownvote: jest.fn(),
      addReply: jest.fn(),
      acceptBestAnswer: jest.fn(),
      getComments: jest.fn(),
      updateReply: jest.fn(),
      deleteReply: jest.fn(),
      toggleReplyUpvote: jest.fn(),
      toggleReplyDownvote: jest.fn(),
      addComment: jest.fn(),
      updateComment: jest.fn(),
      deleteComment: jest.fn(),
      toggleCommentUpvote: jest.fn(),
      toggleCommentDownvote: jest.fn(),
    };

    threadController = new ThreadController(mockThreadService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createThread", () => {
    it("should create a thread successfully", async () => {
      req.body = { title: "Test Title", content: "Test Content" };
      const mockResult = { _id: "thread1", title: "Test Title" };
      mockThreadService.createThread.mockResolvedValue(mockResult);

      await threadController.createThread(req, res, next);

      expect(mockThreadService.createThread).toHaveBeenCalledWith("user123", req.body);
      expect(res.status).toHaveBeenCalledWith(HTTPSTATUS.CREATED);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Thread created successfully",
        data: mockResult,
      });
    });
  });

  describe("getThreads", () => {
    it("should retrieve threads successfully", async () => {
      req.query = { page: 1, limit: 10 };
      const mockResult = { threads: [], pagination: {} };
      mockThreadService.getThreads.mockResolvedValue(mockResult);

      await threadController.getThreads(req, res, next);

      expect(mockThreadService.getThreads).toHaveBeenCalledWith(req.query);
      expect(res.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Threads retrieved successfully",
        data: mockResult.threads,
        pagination: mockResult.pagination,
      });
    });
  });

  describe("getThreadById", () => {
    it("should retrieve a single thread successfully", async () => {
      req.params = { id: "thread123" };
      const mockResult = { _id: "thread123", title: "Test Title" };
      mockThreadService.getThreadById.mockResolvedValue(mockResult);

      await threadController.getThreadById(req, res, next);

      expect(mockThreadService.getThreadById).toHaveBeenCalledWith("thread123");
      expect(res.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Thread retrieved successfully",
        data: mockResult,
      });
    });
  });

  describe("updateThread", () => {
    it("should update a thread successfully", async () => {
      req.params = { id: "thread123" };
      req.body = { title: "Updated Title" };
      const mockResult = { _id: "thread123", title: "Updated Title" };
      mockThreadService.updateThread.mockResolvedValue(mockResult);

      await threadController.updateThread(req, res, next);

      expect(mockThreadService.updateThread).toHaveBeenCalledWith("thread123", "user123", req.body);
      expect(res.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Thread updated successfully",
        data: mockResult,
      });
    });
  });

  describe("deleteThread", () => {
    it("should delete a thread successfully", async () => {
      req.params = { id: "thread123" };
      const mockResult = { message: "Thread deleted successfully" };
      mockThreadService.deleteThread.mockResolvedValue(mockResult);

      await threadController.deleteThread(req, res, next);

      expect(mockThreadService.deleteThread).toHaveBeenCalledWith("thread123", "user123", "student");
      expect(res.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: mockResult.message,
      });
    });
  });

  describe("toggleUpvote", () => {
    it("should toggle an upvote on a thread", async () => {
      req.params = { id: "thread123" };
      const mockResult = { upvotes: 1, upvoted: true };
      mockThreadService.toggleUpvote.mockResolvedValue(mockResult);

      await threadController.toggleUpvote(req, res, next);

      expect(mockThreadService.toggleUpvote).toHaveBeenCalledWith("thread123", "user123");
      expect(res.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Thread upvoted",
        data: mockResult,
      });
    });
  });

  describe("toggleDownvote", () => {
    it("should toggle a downvote on a thread", async () => {
      req.params = { id: "thread123" };
      const mockResult = { downvotes: 1, downvoted: true };
      mockThreadService.toggleDownvote.mockResolvedValue(mockResult);

      await threadController.toggleDownvote(req, res, next);

      expect(mockThreadService.toggleDownvote).toHaveBeenCalledWith("thread123", "user123");
      expect(res.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Thread downvoted",
        data: mockResult,
      });
    });
  });

  describe("addReply", () => {
    it("should add a reply to a thread", async () => {
      req.params = { id: "thread123" };
      req.body = { content: "Test Reply" };
      const mockResult = { _id: "reply123" };
      mockThreadService.addReply.mockResolvedValue(mockResult);

      await threadController.addReply(req, res, next);

      expect(mockThreadService.addReply).toHaveBeenCalledWith("thread123", "user123", req.body);
      expect(res.status).toHaveBeenCalledWith(HTTPSTATUS.CREATED);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Reply added successfully",
        data: mockResult,
      });
    });
  });

  describe("acceptBestAnswer", () => {
    it("should accept best answer", async () => {
      req.params = { threadId: "t1", replyId: "r1" };
      const mockResult = { _id: "t1", isResolved: true };
      mockThreadService.acceptBestAnswer.mockResolvedValue(mockResult);

      await threadController.acceptBestAnswer(req, res, next);

      expect(mockThreadService.acceptBestAnswer).toHaveBeenCalledWith("t1", "r1", "user123");
      expect(res.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Best answer accepted",
        data: mockResult,
      });
    });
  });

  describe("getComments", () => {
    it("should retrieve comments successfully", async () => {
      req.params = { id: "thread123" };
      req.query = { page: 1, limit: 10 };
      const mockResult = { comments: [], pagination: {} };
      mockThreadService.getComments.mockResolvedValue(mockResult);

      await threadController.getComments(req, res, next);

      expect(mockThreadService.getComments).toHaveBeenCalledWith("thread123", req.query);
      expect(res.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Comments retrieved successfully",
        data: mockResult.comments,
        pagination: mockResult.pagination,
      });
    });
  });

  describe("updateReply", () => {
    it("should update a reply successfully", async () => {
      req.params = { id: "t1", replyId: "r1" };
      req.body = { content: "Updated Reply" };
      const mockResult = { _id: "reply1" };
      mockThreadService.updateReply.mockResolvedValue(mockResult);

      await threadController.updateReply(req, res, next);

      expect(mockThreadService.updateReply).toHaveBeenCalledWith("t1", "r1", "user123", req.body);
      expect(res.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Reply updated successfully",
        data: mockResult,
      });
    });
  });

  describe("deleteReply", () => {
    it("should delete a reply successfully", async () => {
      req.params = { id: "t1", replyId: "r1" };
      const mockResult = { message: "Reply deleted successfully" };
      mockThreadService.deleteReply.mockResolvedValue(mockResult);

      await threadController.deleteReply(req, res, next);

      expect(mockThreadService.deleteReply).toHaveBeenCalledWith("t1", "r1", "user123", "student");
      expect(res.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: mockResult.message,
      });
    });
  });

  describe("upvoteReply", () => {
    it("should toggle an upvote on a reply", async () => {
      req.params = { id: "t1", replyId: "r1" };
      const mockResult = { upvotes: 1, upvoted: true };
      mockThreadService.toggleReplyUpvote.mockResolvedValue(mockResult);

      await threadController.upvoteReply(req, res, next);

      expect(mockThreadService.toggleReplyUpvote).toHaveBeenCalledWith("t1", "r1", "user123");
      expect(res.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });
  });

  describe("downvoteReply", () => {
    it("should toggle a downvote on a reply", async () => {
      req.params = { id: "t1", replyId: "r1" };
      const mockResult = { downvotes: 1, downvoted: true };
      mockThreadService.toggleReplyDownvote.mockResolvedValue(mockResult);

      await threadController.downvoteReply(req, res, next);

      expect(mockThreadService.toggleReplyDownvote).toHaveBeenCalledWith("t1", "r1", "user123");
      expect(res.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });
  });

  describe("addComment", () => {
    it("should add a comment successfully", async () => {
      req.params = { id: "thread123" };
      req.body = { content: "Test Comment" };
      const mockResult = { _id: "comment1" };
      mockThreadService.addComment.mockResolvedValue(mockResult);

      await threadController.addComment(req, res, next);

      expect(mockThreadService.addComment).toHaveBeenCalledWith("thread123", "user123", req.body);
      expect(res.status).toHaveBeenCalledWith(HTTPSTATUS.CREATED);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Comment added successfully",
        data: mockResult,
      });
    });
  });

  describe("updateComment", () => {
    it("should update a comment successfully", async () => {
      req.params = { threadId: "t1", commentId: "c1" };
      req.body = { content: "Updated Comment" };
      const mockResult = { _id: "comment1" };
      mockThreadService.updateComment.mockResolvedValue(mockResult);

      await threadController.updateComment(req, res, next);

      expect(mockThreadService.updateComment).toHaveBeenCalledWith("t1", "c1", "user123", req.body);
      expect(res.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Comment updated successfully",
        data: mockResult,
      });
    });
  });

  describe("deleteComment", () => {
    it("should delete a comment successfully", async () => {
      req.params = { threadId: "t1", commentId: "c1" };
      const mockResult = { message: "Comment deleted successfully" };
      mockThreadService.deleteComment.mockResolvedValue(mockResult);

      await threadController.deleteComment(req, res, next);

      expect(mockThreadService.deleteComment).toHaveBeenCalledWith("t1", "c1", "user123", "student");
      expect(res.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: mockResult.message,
      });
    });
  });

  describe("upvoteComment", () => {
    it("should toggle an upvote on a comment", async () => {
      req.params = { threadId: "t1", commentId: "c1" };
      const mockResult = { upvoted: true };
      mockThreadService.toggleCommentUpvote.mockResolvedValue(mockResult);

      await threadController.upvoteComment(req, res, next);

      expect(mockThreadService.toggleCommentUpvote).toHaveBeenCalledWith("t1", "c1", "user123");
      expect(res.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Comment upvoted",
        data: mockResult,
      });
    });
  });

  describe("downvoteComment", () => {
    it("should toggle a downvote on a comment", async () => {
      req.params = { threadId: "t1", commentId: "c1" };
      const mockResult = { downvoted: true };
      mockThreadService.toggleCommentDownvote.mockResolvedValue(mockResult);

      await threadController.downvoteComment(req, res, next);

      expect(mockThreadService.toggleCommentDownvote).toHaveBeenCalledWith("t1", "c1", "user123");
      expect(res.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Comment downvoted",
        data: mockResult,
      });
    });
  });
});
