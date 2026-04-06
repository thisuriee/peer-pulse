const fs = require('fs');
let code = fs.readFileSync('thread.service.js', 'utf8');

code = code.replace(
  /const reply = \{\s*userId,\s*text: replyData\.text,\s*isBestAnswer: false,\s*flaggedForReview: false,\s*\};/g,
  'const reply = {\n      userId,\n      text: replyData.text,\n      isBestAnswer: false,\n      flaggedForReview: false,\n      upvotes: [],\n      downvotes: []\n    };'
);

code = code.replace(
  /const downvoteIndex = reply\.downvotes\.findIndex/g,
  'if (!reply.downvotes) reply.downvotes = [];\n    const downvoteIndex = reply.downvotes.findIndex'
);

code = code.replace(
  /const upvoteIndex = reply\.upvotes\.findIndex/g,
  'if (!reply.upvotes) reply.upvotes = [];\n    const upvoteIndex = reply.upvotes.findIndex'
);

fs.writeFileSync('thread.service.js', code);
