import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  CheckCircle2,
  Loader,
  AlertCircle,
  BookOpen,
  Star,
  Send,
  Trash2,
  MessageSquare,
  Clock,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { useAuthContext } from "@/context/auth-provider";
import {
  getThreadByIdQueryFn,
  upvoteThreadMutationFn,
  downvoteThreadMutationFn,
  addReplyMutationFn,
  acceptReplyMutationFn,
  deleteThreadMutationFn,
  upvoteReplyMutationFn,
  downvoteReplyMutationFn,
} from "@/lib/thread-api";
import { cn } from "@/lib/utils";

// ─── Schemas ──────────────────────────────────────────────────────────────────
const replySchema = z.object({
  text: z
    .string()
    .min(5, "Reply must be at least 5 characters")
    .max(2000, "Reply must not exceed 2000 characters"),
});

// ─── Helper: initials ─────────────────────────────────────────────────────────
const getInitials = (name = "") =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

// ─── ReplyCard ────────────────────────────────────────────────────────────────
const ReplyCard = ({ threadId, reply, isAuthor, isThreadResolved, onAccept, onReplyClick }) => {
  const { _id, text, userId, isBestAnswer, createdAt, upvotes = [], downvotes = [] } = reply;
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  
  const authorName = userId?.name || "Unknown";
  const timeAgo = createdAt
    ? formatDistanceToNow(new Date(createdAt), { addSuffix: true })
    : "";

  const isUpvoted = user && upvotes.includes(user._id);

  const { mutate: upvoteReply, isPending: upvoting } = useMutation({
    mutationFn: () => upvoteReplyMutationFn({ threadId, replyId: _id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["thread", threadId] }),
  });

  const { mutate: downvoteReply, isPending: downvoting } = useMutation({
    mutationFn: () => downvoteReplyMutationFn({ threadId, replyId: _id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["thread", threadId] }),
  });

  const handleReplyClick = () => {
    if (onReplyClick) {
      onReplyClick(authorName);
    } else {
      const textarea = document.getElementById("reply-textarea");
      if (textarea) {
        textarea.focus();
      }
    }
  };

  return (
    <div
      id={`reply-${_id}`}
      className={cn(
        "flex flex-row gap-3 sm:gap-4 bg-card border border-border rounded-xl p-4 sm:p-5 transition-all duration-200",
        isBestAnswer &&
          "border-green-500/40 bg-green-500/5 dark:bg-green-900/10 shadow-sm shadow-green-500/10"
      )}
    >
      {/* Left Column: Votes */}
      <div className="flex flex-col items-center gap-1 sm:px-1 shrink-0 pt-1">
        <button 
          onClick={() => user && upvoteReply()}
          disabled={upvoting || !user}
          className={cn(
            "p-1 sm:p-1.5 rounded-md transition-colors focus:ring-2 focus:ring-primary focus:outline-none",
            isUpvoted 
              ? "bg-primary/20 text-primary hover:bg-primary/30" 
              : "text-muted-foreground hover:bg-primary/10 hover:text-primary",
            (!user || upvoting) && "opacity-50 cursor-not-allowed"
          )}
          aria-label="Upvote Reply"
        >
          {upvoting ? <Loader size={20} className="animate-spin" /> : <ArrowUp size={20} strokeWidth={2.5} />}
        </button>
        <span className="font-semibold text-sm text-foreground my-0.5">
          {upvotes?.length ?? 0}
        </span>
        <button 
          onClick={() => user && downvoteReply()}
          disabled={downvoting || !user}
          className={cn(
            "p-1 sm:p-1.5 rounded-md text-muted-foreground transition-colors focus:ring-2 focus:ring-destructive focus:outline-none",
            (!user || downvoting) ? "opacity-50 cursor-not-allowed" : "hover:bg-destructive/10 hover:text-destructive"
          )}
          aria-label="Downvote Reply"
        >
          {downvoting ? <Loader size={20} className="animate-spin" /> : <ArrowDown size={20} strokeWidth={2.5} />}
        </button>
      </div>

      {/* Right Column: Content */}
      <div className="flex-1 min-w-0 flex flex-col pt-1 sm:pt-1.5">
        {/* Best Answer Banner */}
        {isBestAnswer && (
          <div className="flex items-center gap-2 mb-3 text-green-600 dark:text-green-400">
            <Award size={15} />
            <span className="text-xs font-bold uppercase tracking-wide">
              Best Answer
            </span>
          </div>
        )}

        {/* Author + time */}
        <div className="flex items-center gap-2.5 mb-3">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
              {getInitials(authorName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
            <span className="font-semibold text-foreground truncate">
              {authorName}
            </span>
            <span className="text-muted-foreground/50 hidden sm:inline">·</span>
            <Clock size={11} className="shrink-0 hidden sm:inline" />
            <span className="truncate hidden sm:inline">{timeAgo}</span>
          </div>
        </div>

        {/* Reply text */}
        <p className="text-[14px] text-foreground leading-relaxed whitespace-pre-wrap mb-4">
          {text}
        </p>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-3 mt-auto border-t border-border/50 pt-3">
          <div className="flex items-center gap-2">
            <button 
              onClick={handleReplyClick}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[13px] font-medium text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-colors focus:ring-2 focus:ring-secondary focus:outline-none"
              aria-label={`Reply to ${authorName}`}
            >
              <MessageSquare size={14} />
              <span>Reply</span>
            </button>
          </div>

          {/* Accept as best answer */}
          {isAuthor && !isThreadResolved && (
            <Button
              id={`accept-reply-${_id}`}
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5 text-green-600 border-green-500/30 hover:bg-green-500/10 hover:text-green-600"
              onClick={() => onAccept(_id)}
            >
              <Star size={12} />
              Accept Answer
            </Button>
          )}

          {isAuthor && isThreadResolved && isBestAnswer && (
            <span className="text-xs font-semibold text-green-600 dark:text-green-400 flex items-center gap-1.5 bg-green-500/10 px-2 py-1 rounded-full">
              <CheckCircle2 size={13} />
              Accepted
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── ThreadDetailsPage ────────────────────────────────────────────────────────
const ThreadDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  // ── Data fetching ──────────────────────────────────────────────────────────
  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["thread", id],
    queryFn: () => getThreadByIdQueryFn(id),
    enabled: !!id,
  });

  const thread = data?.data;
  const isAuthor = user && thread && user._id === thread.authorId?._id;
  const isUpvoted = user && thread?.upvotes?.includes(user._id);
  const upvoteCount = thread?.upvotes?.length || 0;

  // ── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: upvote, isPending: upvoting } = useMutation({
    mutationFn: () => upvoteThreadMutationFn(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["thread", id] });
    },
    onError: (err) =>
      toast({
        title: "Error",
        description: err?.message || "Could not upvote.",
        variant: "destructive",
      }),
  });

  const { mutate: downvote, isPending: downvoting } = useMutation({
    mutationFn: () => downvoteThreadMutationFn(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["thread", id] });
    },
    onError: (err) =>
      toast({
        title: "Error",
        description: err?.message || "Could not downvote.",
        variant: "destructive",
      }),
  });

  const { mutate: addReply, isPending: replyPending } = useMutation({
    mutationFn: addReplyMutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["thread", id] });
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      reset();
      toast({ title: "Reply posted!", description: "Your reply has been added." });
    },
    onError: (err) =>
      toast({
        title: "Failed to post reply",
        description: err?.message || "Please try again.",
        variant: "destructive",
      }),
  });

  const { mutate: acceptAnswer, isPending: accepting } = useMutation({
    mutationFn: acceptReplyMutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["thread", id] });
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      toast({
        title: "Best answer accepted!",
        description: "The thread is now marked as resolved.",
      });
    },
    onError: (err) =>
      toast({
        title: "Error",
        description: err?.message || "Could not accept answer.",
        variant: "destructive",
      }),
  });

  const { mutate: deleteThread, isPending: deleting } = useMutation({
    mutationFn: deleteThreadMutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      toast({ title: "Thread deleted", description: "The thread has been removed." });
      navigate("/study-hub");
    },
    onError: (err) =>
      toast({
        title: "Error",
        description: err?.message || "Could not delete thread.",
        variant: "destructive",
      }),
  });

  // ── Reply form ─────────────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(replySchema),
    defaultValues: { text: "" },
  });

  const onSubmitReply = ({ text }) => {
    addReply({ threadId: id, text });
  };

  const handleReplyToUser = (authorName) => {
    const currentText = getValues("text");
    const mention = `@${authorName} `;
    if (!currentText.startsWith(mention)) {
      setValue("text", `${mention}${currentText}`, { shouldValidate: true });
    }
    document.getElementById("reply-textarea")?.focus();
  };

  // ── Loading / Error states ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-3 text-muted-foreground">
        <Loader size={36} className="animate-spin text-primary" />
        <p className="text-sm">Loading thread…</p>
      </div>
    );
  }

  if (isError || !thread) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-3 text-muted-foreground">
        <AlertCircle size={40} className="text-destructive" />
        <p className="text-base font-medium text-foreground">Thread not found</p>
        <p className="text-sm">{error?.message || "This thread may have been deleted."}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/study-hub")}
          className="mt-2 gap-2"
        >
          <ArrowLeft size={14} />
          Back to Study Hub
        </Button>
      </div>
    );
  }

  const {
    title,
    content,
    subject,
    authorId,
    upvotes = [],
    replies = [],
    isResolved,
    createdAt,
  } = thread;

  const timeAgo = formatDistanceToNow(new Date(createdAt), { addSuffix: true });

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Sticky back-nav */}
      <div className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Button
            id="back-to-studyhub-btn"
            variant="ghost"
            size="sm"
            asChild
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <Link to="/study-hub">
              <ArrowLeft size={15} />
              Study Hub
            </Link>
          </Button>

          <span className="text-muted-foreground/50">›</span>

          <span className="text-sm font-medium text-foreground line-clamp-1 flex-1">
            {title}
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ── Thread Main Card ─────────────────────────────────────────────── */}
        <div
          id="thread-main-card"
          className={cn(
            "flex flex-row gap-4 sm:gap-6 bg-card border border-border rounded-xl p-4 sm:p-6",
            isResolved && "border-l-4 border-l-green-500"
          )}
        >
          {/* Left Column: Votes */}
          <div className="flex flex-col items-center gap-1 sm:px-1 shrink-0 pt-1">
            <button 
              id="upvote-thread-btn"
              onClick={() => user && upvote()}
              disabled={upvoting || !user}
              className={cn(
                "p-2 rounded-full transition-colors focus:ring-2 focus:ring-primary focus:outline-none",
                isUpvoted 
                  ? "bg-primary/20 text-primary hover:bg-primary/30" 
                  : "bg-secondary/50 text-muted-foreground hover:bg-primary/10 hover:text-primary",
                (upvoting || !user) && "opacity-50 cursor-not-allowed"
              )}
              aria-label="Upvote Thread"
            >
              {upvoting ? <Loader size={20} className="animate-spin" /> : <ArrowUp size={20} strokeWidth={2.5} />}
            </button>
            <span className="text-xl font-bold text-foreground my-1">
              {upvoteCount}
            </span>
            <button 
              className={cn(
                "p-2 rounded-full bg-secondary/50 text-muted-foreground transition-colors focus:ring-2 focus:ring-destructive focus:outline-none",
                !user ? "opacity-50 cursor-not-allowed" : "hover:bg-destructive/10 hover:text-destructive"
              )}
              aria-label="Downvote Thread"
              disabled={downvoting || !user}
              onClick={() => user && downvote()}
            >
              {downvoting ? <Loader size={20} className="animate-spin" /> : <ArrowDown size={20} strokeWidth={2.5} />}
            </button>
          </div>

          {/* Right Column: Content */}
          <div className="flex-1 min-w-0 flex flex-col">
            {/* Tags row */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-secondary/80 text-secondary-foreground border border-border/50">
                <BookOpen size={12} />
                {subject}
              </span>
              {isResolved && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                  <CheckCircle2 size={12} />
                  Resolved
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight mb-3">
              {title}
            </h1>

            {/* Author + date */}
            <div className="flex items-center gap-2.5 mb-5 pb-5 border-b border-border/50">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                  {getInitials(authorId?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="text-[14px] min-w-0">
                <span className="font-semibold text-foreground">
                  {authorId?.name || "Unknown"}
                </span>
                <span className="text-muted-foreground text-[13px] ml-2">
                  · {timeAgo}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="prose prose-sm dark:prose-invert max-w-none mb-6">
              <p className="text-[15px] text-foreground leading-relaxed whitespace-pre-wrap">
                {content}
              </p>
            </div>

            {/* Action bar */}
            <div className="flex items-center justify-between gap-3 flex-wrap mt-auto">
              <div className="flex items-center gap-2">
                {/* Reply count indicator */}
                <span className="flex items-center gap-1.5 text-[14px] font-medium text-muted-foreground">
                  <MessageSquare size={16} />
                  <span className="font-semibold">{replies.length}</span>
                  <span className="hidden sm:inline">
                    {replies.length === 1 ? "Comment" : "Comments"}
                  </span>
                </span>
              </div>

              {/* Owner actions */}
              {isAuthor && (
                <Button
                  id="delete-thread-btn"
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteThread(id)}
                  disabled={deleting}
                  className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  {deleting ? (
                    <Loader size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                  Delete
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ── Replies Section ─────────────────────────────────────────────── */}
        <div id="comments">
          <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
            <MessageSquare size={17} className="text-primary" />
            {replies.length} {replies.length === 1 ? "Reply" : "Replies"}
          </h2>

          {replies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-card border border-border rounded-xl">
              <MessageSquare size={32} className="opacity-20 mb-2" />
              <p className="text-sm">No replies yet. Be the first to respond!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {replies.map((reply) => (
                <ReplyCard
                  key={reply._id}
                  threadId={id}
                  reply={reply}
                  isAuthor={isAuthor}
                  isThreadResolved={isResolved}
                  onAccept={(replyId) =>
                    acceptAnswer({ threadId: id, replyId })
                  }
                  onReplyClick={handleReplyToUser}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Add Reply Form ──────────────────────────────────────────────── */}
        {user ? (
          <div
            id="add-reply-section"
            className="flex flex-row gap-3 sm:gap-4 bg-card border border-border rounded-xl p-4 sm:p-5"
          >
            <div className="hidden sm:block shrink-0">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
            </div>
            
            <div className="flex-1 min-w-0">
              <form onSubmit={handleSubmit(onSubmitReply)} className="space-y-3">
                <div>
                  <textarea
                    id="reply-textarea"
                    rows={4}
                    placeholder="Share your knowledge, ask for clarification, or contribute to the discussion..."
                    {...register("text")}
                    disabled={replyPending || accepting}
                    className={cn(
                      "w-full px-3.5 py-3 rounded-lg border text-[14px] bg-background resize-none transition-colors",
                      "focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      "placeholder:text-muted-foreground",
                      errors.text ? "border-destructive focus:ring-destructive/50" : "border-input"
                    )}
                  />
                  {errors.text && (
                    <p className="text-xs font-medium text-destructive mt-1.5 flex items-center gap-1">
                      <AlertCircle size={12} />
                      {errors.text.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-muted-foreground hidden sm:inline-block">
                    Markdown is disabled. Keep comments respectful and kind.
                  </span>
                  <Button
                    id="submit-reply-btn"
                    type="submit"
                    size="sm"
                    disabled={replyPending || accepting}
                    className="gap-2 min-w-[120px] font-semibold"
                  >
                    {replyPending ? (
                      <>
                        <Loader size={14} className="animate-spin" />
                        Posting...
                      </>
                    ) : (
                      <>
                        <Send size={15} />
                        Post Comment
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <MessageSquare size={32} className="mx-auto opacity-20 mb-3" />
            <p className="text-[15px] font-medium text-foreground mb-1">
              Join the conversation
            </p>
            <p className="text-[14px] text-muted-foreground">
              <Link
                to="/"
                className="text-primary font-semibold hover:underline"
              >
                Sign in
              </Link>{" "}
              to leave a comment and help others.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ThreadDetailsPage;
