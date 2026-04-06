require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');
const { ThreadModel } = require('../../database/models/thread.model');
const { ThreadService } = require('./thread.service');

mongoose.connect('mongodb+srv://admin:admin123@cluster0.ulxgval.mongodb.net/peer-pulse?appName=Cluster0')
  .then(async () => {
    const threadId = '69d3eae1a1418ccbcd930ed9'; // valid thread
    const userId = '69d3dcd6e77382b37da23273'; // valid user ('alex')

    const ts = new ThreadService();

    console.log('Adding reply...');
    const newThread = await ts.addReply(threadId, userId, { text: 'Direct Test Reply' });
    const replyId = newThread.replies[newThread.replies.length - 1]._id.toString();
    console.log('Added reply:', replyId);

    console.log('Upvoting...');
    try {
      const upRes = await ts.toggleReplyUpvote(threadId, replyId, userId);
      console.log('Upvote success:', upRes);
    } catch(e) {
      console.error('UPVOTE ERROR:', e.message);
    }

    console.log('Downvoting...');
    try {
      const downRes = await ts.toggleReplyDownvote(threadId, replyId, userId);
      console.log('Downvote success:', downRes);
    } catch(e) {
      console.error('DOWNVOTE ERROR:', e.message);
    }

    console.log('Deleting...');
    try {
      const delRes = await ts.deleteReply(threadId, replyId, userId, 'tutor');
      console.log('Delete success:', delRes);
    } catch(e) {
      console.error('DELETE ERROR:', e.message);
    }

    process.exit(0);
  })
  .catch(err => {
    console.error('DB ERROR:', err.message);
    process.exit(1);
  });
