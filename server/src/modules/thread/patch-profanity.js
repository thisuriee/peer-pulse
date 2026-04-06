const fs = require('fs');
let code = fs.readFileSync('thread.service.js', 'utf8');

// Patch 1: updateThread
code = code.replace(
  /const titleFlagged = await ProfanityFilter\.shouldFlag\(updateData\.title\);\s*if \(titleFlagged\) flaggedForReview = true;/g,
  'const titleFlagged = await ProfanityFilter.shouldFlag(updateData.title);\n      if (titleFlagged) throw new BadRequestException("Your content violates community guidelines. Please revise and try again.");'
);
code = code.replace(
  /const contentFlagged = await ProfanityFilter\.shouldFlag\(updateData\.content\);\s*if \(contentFlagged\) flaggedForReview = true;/g,
  'const contentFlagged = await ProfanityFilter.shouldFlag(updateData.content);\n      if (contentFlagged) throw new BadRequestException("Your content violates community guidelines. Please revise and try again.");'
);

// Patch 2: addReply
code = code.replace(
  /const flaggedForReview = await ProfanityFilter\.shouldFlag\(replyData\.text\);\s*const reply = \{\s*userId,\s*text: replyData\.text,\s*isBestAnswer: false,\s*flaggedForReview,\s*\};/g,
  'const flaggedForReview = await ProfanityFilter.shouldFlag(replyData.text);\n    if (flaggedForReview) throw new BadRequestException("Your content violates community guidelines. Please revise and try again.");\n\n    const reply = {\n      userId,\n      text: replyData.text,\n      isBestAnswer: false,\n      flaggedForReview: false,\n    };'
);

// Patch 3: updateReply
code = code.replace(
  /const flaggedForReview = await ProfanityFilter\.shouldFlag\(updateData\.text\);\s*reply\.text = updateData\.text;\s*reply\.flaggedForReview = flaggedForReview;/g,
  'const flaggedForReview = await ProfanityFilter.shouldFlag(updateData.text);\n    if (flaggedForReview) throw new BadRequestException("Your content violates community guidelines. Please revise and try again.");\n\n    reply.text = updateData.text;\n    reply.flaggedForReview = false;'
);

// Patch 4: addComment
code = code.replace(
  /const flaggedForReview = await ProfanityFilter\.shouldFlag\(commentData\.content\);\s*const comment = \{\s*userId,\s*content: commentData\.content,\s*parentComment: commentData\.parentComment \|\| null,\s*upvotes: \[\],\s*downvotes: \[\],\s*flaggedForReview,\s*\};/g,
  'const flaggedForReview = await ProfanityFilter.shouldFlag(commentData.content);\n    if (flaggedForReview) throw new BadRequestException("Your content violates community guidelines. Please revise and try again.");\n\n    const comment = {\n      userId,\n      content: commentData.content,\n      parentComment: commentData.parentComment || null,\n      upvotes: [],\n      downvotes: [],\n      flaggedForReview: false,\n    };'
);

// Patch 5: updateComment
code = code.replace(
  /const flaggedForReview = await ProfanityFilter\.shouldFlag\(updateData\.content\);\s*comment\.content = updateData\.content;\s*comment\.flaggedForReview = flaggedForReview;/g,
  'const flaggedForReview = await ProfanityFilter.shouldFlag(updateData.content);\n    if (flaggedForReview) throw new BadRequestException("Your content violates community guidelines. Please revise and try again.");\n\n    comment.content = updateData.content;\n    comment.flaggedForReview = false;'
);

fs.writeFileSync('thread.service.js', code);
