const { describe, it, expect, beforeAll, afterAll, afterEach } = require('@jest/globals');
const request = require('supertest');
const app = require('../../helpers/app.helper');
const { connectTestDB, clearTestDB, disconnectTestDB } = require('../../helpers/db.helper');
const UserModel = require('../../../src/database/models/user.model');
const AuthSessionModel = require('../../../src/database/models/authSession.model');
const { ThreadModel } = require('../../../src/database/models/thread.model');
const { signJwtToken } = require('../../../src/common/utils/token-utils');
const { ProfanityFilter } = require('../../../src/common/utils/profanity-filter.utils');
const mongoose = require('mongoose');

beforeAll(async () => await connectTestDB());
afterEach(async () => await clearTestDB());
afterAll(async () => await disconnectTestDB());

const createTestUser = async (role = "student") => {
  const user = await UserModel.create({
    name: "Test " + role,
    email: `test-${Date.now()}-${Math.random()}@example.com`,
    password: "password123",
    role
  });
  
  const session = await AuthSessionModel.create({
    userId: user._id,
    userAgent: "Jest",
  });

  const accessToken = signJwtToken({ userId: user._id, sessionId: session._id });
  return { user, session, accessToken };
};

describe("Thread Integration Tests", () => {
  describe("Flow A (Browsing & Pagination)", () => {
    it("returns exactly 10 items for page=1 out of 15 dummy threads", async () => {
      const { user } = await createTestUser();
      
      const threadsToInsert = [];
      for (let i = 0; i < 15; i++) {
        threadsToInsert.push({
          authorId: user._id,
          title: `Dummy Thread ${i}`,
          content: `This is the testing dummy thread content ${i}`,
          upvotes: []
        });
      }
      
      await ThreadModel.insertMany(threadsToInsert);
      
      const response = await request(app).get('/api/v1/threads?page=1');
      
      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(10);
      expect(response.body.pagination.total).toBe(15);
      expect(response.body.pagination.page).toBe(1);
    });

    it("returns the most upvoted thread first when sort=mostUpvoted", async () => {
      const { user } = await createTestUser();
      
      const dummyUsers = [
        new mongoose.Types.ObjectId(),
        new mongoose.Types.ObjectId(),
        new mongoose.Types.ObjectId(),
      ];
      
      await ThreadModel.create({
        authorId: user._id,
        title: "Thread with 1 upvote",
        content: "Content with 1 upvote test",
        upvotes: [dummyUsers[0]]
      });
      
      await ThreadModel.create({
        authorId: user._id,
        title: "Thread with 3 upvote",
        content: "Content with 3 upvote test",
        upvotes: dummyUsers
      });
      
      await ThreadModel.create({
        authorId: user._id,
        title: "Thread with 0 upvote",
        content: "Content with 0 upvote test",
        upvotes: []
      });
      
      const response = await request(app).get('/api/v1/threads?sort=mostUpvoted');
      
      expect(response.status).toBe(200);
      expect(response.body.data[0].title).toBe("Thread with 3 upvote");
      expect(response.body.data[1].title).toBe("Thread with 1 upvote");
      expect(response.body.data[2].title).toBe("Thread with 0 upvote");
    });
  });

  describe("Flow B (Creating a Thread)", () => {
    beforeEach(() => {
      jest.restoreAllMocks();
    });

    it("Success Scenario: saves to the DB and returns 201 status code", async () => {
      const { accessToken } = await createTestUser("student");
      
      // Mock ProfanityFilter to return safe content
      jest.spyOn(ProfanityFilter, 'analyzeText').mockResolvedValue({
        toxicity: 0.1,
        insult: 0.1,
        threat: 0.1
      });

      const payload = {
        title: "Valid thread title",
        content: "Hello, this is a very valid and safe thread content for testing."
      };
      
      const response = await request(app)
        .post('/api/v1/threads')
        .set('Cookie', `accessToken=${accessToken}`)
        .send(payload);
        
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(payload.title);
      
      const dbThread = await ThreadModel.findById(response.body.data._id);
      expect(dbThread).not.toBeNull();
      expect(dbThread.title).toBe(payload.title);
    });

    it("Error Scenario: intercepts toxic content, throws Custom Error and 400", async () => {
      const { accessToken } = await createTestUser("student");
      
      // Mock ProfanityFilter to return highly toxic content
      jest.spyOn(ProfanityFilter, 'analyzeText').mockResolvedValue({
        toxicity: 0.95,
        insult: 0.9,
        threat: 0.1
      });

      const payload = {
        title: "Some terrible toxic word here",
        content: "And some really toxic threatening content."
      };
      
      const response = await request(app)
        .post('/api/v1/threads')
        .set('Cookie', `accessToken=${accessToken}`)
        .send(payload);
        
      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Your content violates community guidelines. Please revise and try again.");
      
      const dbCount = await ThreadModel.countDocuments();
      expect(dbCount).toBe(0);
    });
  });

  describe("Flow C (The Resolution Loop)", () => {
    it("Success Scenario: thread owner accepts best answer", async () => {
      const { user: owner, accessToken: ownerToken } = await createTestUser("student");
      const { user: replier } = await createTestUser("student");
      
      const thread = await ThreadModel.create({
        authorId: owner._id,
        title: "Thread needs an answer",
        content: "Who can help me with this test case?",
        replies: [{
          _id: new mongoose.Types.ObjectId(),
          userId: replier._id,
          text: "Here is the help you asked for",
          isBestAnswer: false
        }]
      });
      
      const replyId = thread.replies[0]._id;
      
      const response = await request(app)
        .patch(`/api/v1/threads/${thread._id}/replies/${replyId}/accept`)
        .set('Cookie', `accessToken=${ownerToken}`);
        
      expect(response.status).toBe(200);
      
      const updatedThread = await ThreadModel.findById(thread._id);
      expect(updatedThread.isResolved).toBe(true);
      
      const updatedReply = updatedThread.replies.id(replyId);
      expect(updatedReply.isBestAnswer).toBe(true);
    });

    it("Authorization Error: non-owner user receives 403 Forbidden", async () => {
      const { user: owner } = await createTestUser("student");
      const { user: randomUser, accessToken: randomUserToken } = await createTestUser("student");
      
      const thread = await ThreadModel.create({
        authorId: owner._id,
        title: "Thread needs an answer",
        content: "Who can help me with this test case?",
        replies: [{
          _id: new mongoose.Types.ObjectId(),
          userId: randomUser._id,
          text: "My provided solution",
          isBestAnswer: false
        }]
      });
      
      const replyId = thread.replies[0]._id;
      
      // Try accepting as randomUser instead of owner
      const response = await request(app)
        .patch(`/api/v1/threads/${thread._id}/replies/${replyId}/accept`)
        .set('Cookie', `accessToken=${randomUserToken}`);
        
      expect(response.status).toBe(403);
      expect(response.body.message).toMatch(/Forbidden|Only the thread author/i);
      
      const unchangedThread = await ThreadModel.findById(thread._id);
      expect(unchangedThread.isResolved).toBe(false);
      expect(unchangedThread.replies.id(replyId).isBestAnswer).toBe(false);
    });
  });

  describe("Additional Thread Features", () => {
    it("should get a thread by ID", async () => {
      const { user } = await createTestUser();
      
      const thread = await ThreadModel.create({
        authorId: user._id,
        title: "Specific thread",
        content: "Specific content",
      });

      const response = await request(app).get(`/api/v1/threads/${thread._id}`);
      
      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe("Specific thread");
      expect(response.body.data.authorId._id.toString()).toBe(user._id.toString());
    });

    it("should update a thread provided valid ID and owner JWT", async () => {
      const { user, accessToken } = await createTestUser();
      
      const thread = await ThreadModel.create({
        authorId: user._id,
        title: "Old title",
        content: "Old content",
      });

      jest.spyOn(ProfanityFilter, 'shouldFlag').mockResolvedValue(false);

      const response = await request(app)
        .put(`/api/v1/threads/${thread._id}`)
        .set('Cookie', `accessToken=${accessToken}`)
        .send({
          title: "New title",
          content: "New content"
        });
      
      expect(response.status).toBe(200);
      
      const updatedThread = await ThreadModel.findById(thread._id);
      expect(updatedThread.title).toBe("New title");
    });
    
    it("should add a reply to a thread", async () => {
      const { user, accessToken } = await createTestUser();
      const { user: replier, accessToken: replierToken } = await createTestUser();
      
      const thread = await ThreadModel.create({
        authorId: user._id,
        title: "Needs reply",
        content: "Content",
      });

      jest.spyOn(ProfanityFilter, 'analyzeText').mockResolvedValue({
        toxicity: 0.1,
        insult: 0.1,
        threat: 0.1
      });

      const response = await request(app)
        .post(`/api/v1/threads/${thread._id}/replies`)
        .set('Cookie', `accessToken=${replierToken}`)
        .send({ text: "This is a new reply" });
      
      expect(response.status).toBe(201);
      expect(response.body.data.replies[0].text).toBe("This is a new reply");
      // Mongoose might populate or nested string check
      expect(response.body.data.replies[0].userId._id ? response.body.data.replies[0].userId._id.toString() : response.body.data.replies[0].userId.toString()).toBe(replier._id.toString());
    });

    it("should upvote a thread successfully", async () => {
      const { user } = await createTestUser();
      const { user: voter, accessToken: voterToken } = await createTestUser();
      
      const thread = await ThreadModel.create({
        authorId: user._id,
        title: "Please upvote",
        content: "Upvotes needed",
        upvotes: []
      });

      const response = await request(app)
        .patch(`/api/v1/threads/${thread._id}/upvote`)
        .set('Cookie', `accessToken=${voterToken}`);
      
      expect(response.status).toBe(200);
      
      const updatedThread = await ThreadModel.findById(thread._id);
      expect(updatedThread.upvotes).toHaveLength(1);
      expect(updatedThread.upvotes[0].toString()).toBe(voter._id.toString());
    });
  });
});
