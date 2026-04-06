const fs = require('fs');
let code = fs.readFileSync('ReplyItem.jsx', 'utf8');

// Replace the single vote count line with upvote and downvote count display
const voteSection = \<div className="flex items-center gap-1 bg-muted/50 rounded-full border border-border p-0.5">
              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={handleUpvote} disabled={loading}>
                <ThumbsUp className="w-3.5 h-3.5" />
              </Button>
              <span className="text-xs font-semibold px-1 min-w-[1rem] text-center text-primary">
                {reply.upvotes?.length || reply.upvoteCount || 0}
              </span>
              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={handleDownvote} disabled={loading}>
                <ThumbsDown className="w-3.5 h-3.5" />
              </Button>
              <span className="text-xs font-semibold px-1 min-w-[1rem] text-center text-destructive">
                {reply.downvotes?.length || reply.downvoteCount || 0}
              </span>
            </div>\;

code = code.replace(
  /<div className="flex items-center gap-1 bg-muted\/50 rounded-full border border-border p-0\.5">[\s\S]*?<\/div>/,
  voteSection
);

fs.writeFileSync('ReplyItem.jsx', code);
