const fs = require('fs');
let code = fs.readFileSync('ReplyItem.jsx', 'utf8');

code = code.replace(
  /toast\(\{ title: 'Error', description: 'Failed to upvote reply', variant: 'destructive' \}\);/g,
  "toast({ title: 'Error', description: err.response?.data?.message || 'Failed to upvote reply', variant: 'destructive' });"
);

code = code.replace(
  /toast\(\{ title: 'Error', description: 'Failed to downvote reply', variant: 'destructive' \}\);/g,
  "toast({ title: 'Error', description: err.response?.data?.message || 'Failed to downvote reply', variant: 'destructive' });"
);

fs.writeFileSync('ReplyItem.jsx', code);
