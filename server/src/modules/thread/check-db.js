const mongoose = require('mongoose');
const { ThreadModel } = require('../../database/models/thread.model');

mongoose.connect('mongodb+srv://admin:admin123@cluster0.ulxgval.mongodb.net/peer-pulse?appName=Cluster0')
  .then(async () => {
    const thread = await ThreadModel.findById('69d3eae1a1418ccbcd930ed9');
    if (!thread) {
      console.log('THREAD NOT FOUND');
    } else {
      console.log('THREAD FOUND: ' + thread._id);
      const reply = thread.replies.id('69d3ec4aa1418ccbcd930f1e');
      if (!reply) console.log('REPLY NOT FOUND');
      else console.log('REPLY FOUND');
    }
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
