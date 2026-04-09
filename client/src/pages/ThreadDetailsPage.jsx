import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useThreadContext } from '../context/ThreadContext';
import { useAuth } from '../context/AuthContext';
import { Loader } from '../components/Loader';
import { ReplyItem } from '../components/ReplyItem';
import { Button } from '../components/ui/button';
import { ArrowLeft, ThumbsUp } from 'lucide-react';
import { threadService } from '../services/threadService';
import { useToast } from '../hooks/use-toast';
import { Navbar } from '../components/Navbar';

const ThreadDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { selectedThread, loading, fetchThreadById, upvoteThread } = useThreadContext();
  const { user } = useAuth();
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchThreadById(id);
  }, [id, fetchThreadById]);

  if (loading || !selectedThread) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex justify-center items-center p-12">
          <Loader />
        </main>
      </div>
    );
  }

  const currentUserIdStr = (user?._id || user?.id)?.toString();
  const threadAuthorIdStr = (selectedThread.authorId?._id || selectedThread.authorId?.id || selectedThread.authorId || selectedThread.author?._id || selectedThread.author?.id || selectedThread.author)?.toString();
  const isOwner = Boolean(currentUserIdStr && threadAuthorIdStr && currentUserIdStr === threadAuthorIdStr);

  const handleUpvote = async () => {
    try {
      await upvoteThread(id);
      toast({ title: 'Success', description: 'Thread upvoted' });
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to upvote';
      toast({ title: 'Error', description: errorMsg, variant: 'destructive' });
    }
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      await threadService.addReply(id, { text: replyText });
      setReplyText('');
      fetchThreadById(id);
      toast({ title: 'Success', description: 'Reply added successfully' });
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to add reply';
      toast({ title: 'Error', description: errorMsg, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptReply = async (replyId) => {
    try {
      await threadService.acceptReply(id, replyId);
      fetchThreadById(id);
      toast({ title: 'Success', description: 'Marked as best answer' });
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to accept reply';
      toast({ title: 'Error', description: errorMsg, variant: 'destructive' });
    }
  };

  const handleDeleteThread = async () => {
    if (!window.confirm("Are you sure you want to delete this thread?")) return;
    try {
      await threadService.deleteThread(id);
      toast({ title: 'Success', description: 'Thread deleted' });
      navigate('/threads');
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to delete thread';
      toast({ title: 'Error', description: errorMsg, variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 md:py-8 space-y-6">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Discussions
        </button>

        <div className="bg-card text-card-foreground rounded-2xl border-2 border-border pp-brutal-shadow p-6">
          <div className="flex justify-between items-start mb-4 gap-4">
            <h1 className="text-2xl font-bold font-display tracking-tight leading-snug flex-1">{selectedThread.title}</h1>
            <div className="flex items-center gap-2 shrink-0">
              {isOwner && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleDeleteThread}
                  className="text-destructive hover:bg-destructive/10"
                >
                  Delete
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleUpvote} 
                className="gap-2 border-2 rounded-full font-semibold hover:bg-primary/5 hover:text-primary transition-colors"
              >
                <ThumbsUp size={16} /> 
                {selectedThread.upvoteCount || selectedThread.upvotes?.length || 0}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-6">
            <span className="font-semibold text-foreground">
              {selectedThread.authorId?.name || selectedThread.author?.name || 'Unknown'}
            </span>
            <span>•</span> 
            <span className="bg-secondary px-2.5 py-0.5 rounded-full font-medium border border-border">
              {selectedThread.subject}
            </span>
            {selectedThread.isResolved && (
              <span className="bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full font-medium text-xs uppercase tracking-wide border border-green-200">
                Resolved
              </span>
            )}
            {selectedThread.assignedTutor && (
              <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full font-medium text-xs uppercase tracking-wide border border-blue-200">
                Assigned to: {selectedThread.assignedTutor?.name || 'Tutor'}
              </span>
            )}
            <span className="ml-auto text-xs">
              {new Date(selectedThread.createdAt).toLocaleDateString()}
            </span>
          </div>

          <p className="whitespace-pre-wrap text-foreground/90 leading-relaxed">
            {selectedThread.content}
          </p>
        </div>

        <div className="mt-8 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold font-display tracking-tight">
              Replies ({selectedThread.replies?.length || 0})
            </h2>
          </div>
          
          <div className="space-y-4">
            {selectedThread.replies?.map(reply => (
              <ReplyItem 
                key={reply.id || reply._id} 
                reply={reply} 
                isOwner={isOwner} 
                currentUserId={user?._id || user?.id}
                threadId={id}
                onAccept={!selectedThread.isResolved ? handleAcceptReply : undefined} 
                onReplyUpdated={() => fetchThreadById(id)}
              />
            ))}
            {(!selectedThread.replies || selectedThread.replies.length === 0) && (
              <div className="text-center py-6 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                No replies yet. Be the first to answer!
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleReplySubmit} className="mt-8 bg-card border-2 border-border p-4 rounded-xl pp-brutal-shadow">
          <h3 className="text-lg font-bold mb-3 tracking-tight">Add a Reply</h3>
          <textarea
            className="flex min-h-[100px] w-full rounded-md border-2 border-input bg-background px-3 py-2 text-sm font-medium mb-4 focus-visible:outline-none focus-visible:border-primary transition-colors"
            placeholder="Type your answer here..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            disabled={submitting}
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={submitting || !replyText.trim()} className="font-semibold pp-brutal-shadow">
              {submitting ? 'Posting...' : 'Post Reply'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default ThreadDetailsPage;
