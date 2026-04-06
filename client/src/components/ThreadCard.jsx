import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ThumbsUp, MessageCircle } from 'lucide-react';

export const ThreadCard = ({ thread }) => {
  return (
    <Card className="mb-4 hover:shadow-md transition-shadow border-2 border-border pp-brutal-shadow group overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-4">
          <Link to={`/threads/${thread.id || thread._id}`} className="hover:text-primary transition-colors flex-1">
            <CardTitle className="text-xl font-display leading-snug line-clamp-1">{thread.title}</CardTitle>
          </Link>
          {thread.isResolved && (
            <span className="px-2.5 py-0.5 bg-green-100 text-green-800 border border-green-300 font-semibold tracking-wide text-xs rounded-full shrink-0 uppercase">
              Resolved
            </span>
          )}
        </div>
        <div className="text-sm text-muted-foreground mt-1 flex flex-wrap items-center gap-2">
          <span className="font-semibold text-foreground/80">{thread.authorId?.name || thread.author?.name || 'Unknown'}</span>
          <span>•</span>
          <span className="px-2.5 py-0.5 bg-accent/50 border border-border rounded-full font-medium">{thread.subject}</span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="line-clamp-2 text-foreground/80 leading-relaxed font-medium">{thread.content}</p>
      </CardContent>
      <CardFooter className="flex gap-4 text-muted-foreground pt-0 mt-2">
        <div className="flex items-center gap-1.5 font-semibold bg-primary/5 px-2.5 py-1 rounded-md text-primary shrink-0 transition-colors group-hover:bg-primary/10">
          <ThumbsUp size={16} />
          <span className="text-sm">{thread.upvoteCount || thread.upvotes?.length || 0}</span>
        </div>
        <div className="flex items-center gap-1.5 font-semibold bg-accent/50 px-2.5 py-1 rounded-md text-foreground/70 shrink-0">
          <MessageCircle size={16} />
          <span className="text-sm">{thread.replyCount || thread.replies?.length || 0} Replies</span>
        </div>
        <div className="ml-auto text-xs text-muted-foreground self-center">
          {new Date(thread.createdAt).toLocaleDateString()}
        </div>
      </CardFooter>
    </Card>
  );
};
