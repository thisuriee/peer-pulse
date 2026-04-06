const fs = require('fs');
let code = fs.readFileSync('ReplyItem.jsx', 'utf8');

code = code.replace(
  /toast\(\{ title: 'Error', description: 'Failed to update reply', variant: 'destructive' \}\);/g,
  "toast({ title: 'Error', description: err.response?.data?.message || 'Failed to update reply', variant: 'destructive' });"
);

fs.writeFileSync('ReplyItem.jsx', code);
