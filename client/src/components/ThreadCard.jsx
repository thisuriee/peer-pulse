import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ThumbsUp, MessageCircle, FileText } from 'lucide-react';

export const ThreadCard = ({ thread }) => {
  return (
    <Card className="mb-4 hover:shadow-md transition-all border-2 border-border pp-brutal-shadow-sm hover:pp-brutal-shadow group overflow-hidden bg-background">
      <CardHeader className="pb-3 pt-5 px-5 md:px-6">
        <div className="flex justify-between items-start gap-4">
          <Link to={`/threads/${thread.id || thread._id}`} className="hover:text-primary transition-colors flex-1 group-hover:underline decoration-2 underline-offset-4 decoration-primary/30">
            <CardTitle className="text-xl md:text-2xl font-display font-bold leading-snug line-clamp-2">{thread.title}</CardTitle>
          </Link>
          {thread.isResolved && (
            <span className="px-2.5 py-0.5 bg-green-100 text-green-800 border-2 border-green-300 font-bold tracking-wide text-[10px] sm:text-xs rounded-full shrink-0 uppercase pp-brutal-shadow-sm">
              Resolved
            </span>
          )}
        </div>
        <div className="text-sm text-muted-foreground mt-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0 border border-primary/20">
              {(thread.authorId?.name || thread.author?.name || 'U')[0].toUpperCase()}
            </div>
            <span className="font-semibold text-foreground/90">{thread.authorId?.name || thread.author?.name || 'Unknown'}</span>
          </div>
          <span className="text-muted-foreground/50">•</span>
          <span className="px-2.5 py-0.5 bg-accent text-accent-foreground border border-border rounded-full font-bold text-xs tracking-wide">{thread.subject}</span>
        </div>
      </CardHeader>
      
      <CardContent className="px-5 md:px-6 pb-4">
        <p className="line-clamp-2 text-foreground/80 leading-relaxed font-medium text-sm md:text-base">{thread.content}</p>
      </CardContent>
      
      <CardFooter className="flex flex-wrap items-center justify-between gap-4 text-muted-foreground pt-4 pb-5 px-5 md:px-6 bg-muted/30 border-t-2 border-border/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold bg-background border-2 border-border px-3 py-1.5 rounded-full text-foreground shrink-0 pp-brutal-shadow-sm transition-colors group-hover:border-primary/50 group-hover:text-primary">
            <ThumbsUp size={14} className="stroke-[2.5]" />
            <span className="text-sm">{thread.upvoteCount || thread.upvotes?.length || 0}</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold bg-background border-2 border-border px-3 py-1.5 rounded-full text-foreground shrink-0 pp-brutal-shadow-sm transition-colors group-hover:border-blue-500/50 group-hover:text-blue-600">
            <MessageCircle size={14} className="stroke-[2.5]" />
            <span className="text-sm">{thread.replyCount || thread.replies?.length || 0}</span>
          </div>
        </div>
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          {new Date(thread.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </CardFooter>
    </Card>
  );
};
