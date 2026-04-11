import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Edit, Trash, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { threadService } from '@/services/threadService';

export const ReplyItem = ({ reply, isOwner, onAccept, threadId, currentUserId, onReplyUpdated }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(reply.text || reply.content || '');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const currentUserIdStr = currentUserId?.toString();
  const replyAuthorIdStr = (reply.userId?.id || reply.userId?._id || reply.userId || reply.user?.id || reply.user?._id || reply.user || reply.authorId || reply.author)?.toString();
  const isReplyAuthor = currentUserIdStr && replyAuthorIdStr && currentUserIdStr === replyAuthorIdStr;

  const handleUpdate = async () => {
    if (!editContent.trim()) return;
    setLoading(true);
    try {
      await threadService.updateReply(threadId, reply.id || reply._id, { text: editContent, content: editContent });
      setIsEditing(false);
      toast({ title: 'Success', description: 'Reply updated successfully' });
      if (onReplyUpdated) onReplyUpdated();
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to update reply';
      toast({ title: 'Error', description: errorMsg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await threadService.deleteReply(threadId, reply.id || reply._id);
      toast({ title: 'Success', description: 'Reply deleted' });
      if (onReplyUpdated) onReplyUpdated();
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to delete reply';
      toast({ title: 'Error', description: errorMsg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async () => {
    setLoading(true);
    try {
      await threadService.upvoteReply(threadId, reply.id || reply._id);
      if (onReplyUpdated) onReplyUpdated();
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to upvote reply';
      toast({ title: 'Error', description: errorMsg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownvote = async () => {
    setLoading(true);
    try {
      await threadService.downvoteReply(threadId, reply.id || reply._id);
      if (onReplyUpdated) onReplyUpdated();
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to downvote reply';
      toast({ title: 'Error', description: errorMsg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={`mb-3 border-2 transition-colors ${
      reply.isBestAnswer 
        ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/10 pp-brutal-shadow-green' 
        : 'border-border/50 hover:border-border pp-brutal-shadow-sm hover:pp-brutal-shadow'
    }`}>
      <CardContent className="pt-4 flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="font-bold text-foreground text-sm">
              {reply.userId?.name || reply.user?.name || 'User'}
            </span>
            <span className="text-xs text-muted-foreground">• {new Date(reply.createdAt).toLocaleDateString()}</span>
            
            {reply.isBestAnswer && (
              <span className="flex items-center text-xs font-bold text-green-700 bg-green-100 border border-green-300 px-2 py-0.5 rounded-full uppercase tracking-wide">
                <CheckCircle size={12} className="mr-1 stroke-2" /> Best Answer
              </span>
            )}
          </div>

          {isEditing ? (
            <div className="mt-2 space-y-2">
              <textarea 
                className="w-full p-2 text-sm border-2 rounded-md bg-background text-foreground"
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                disabled={loading}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleUpdate} disabled={loading}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} disabled={loading}>Cancel</Button>
              </div>
            </div>
          ) : (
            <p className="text-foreground/90 font-medium leading-relaxed">{reply.text || reply.content}</p>
          )}
        </div>
        
        <div className="shrink-0 flex sm:flex-col items-end gap-2">
          {/* Voting for replies */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-full border border-border p-0.5">
            <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={handleUpvote} disabled={loading}>
              <ThumbsUp className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs font-semibold px-1 min-w-[1rem] text-center">
              {reply.upvotes?.length || 0}
            </span>
            <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={handleDownvote} disabled={loading}>
              <ThumbsDown className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="flex gap-2 mt-auto">
            {isOwner && !reply.isBestAnswer && onAccept && (
               <Button 
                 variant="outline" 
                 size="sm" 
                 onClick={() => onAccept(reply.id || reply._id)}
                 className="border-2 font-semibold hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-colors h-8 text-xs"
               >
                 Mark Best Answer
               </Button>
            )}
            {isReplyAuthor && !isEditing && (
              <>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => setIsEditing(true)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={handleDelete} disabled={loading}>
                  <Trash className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
