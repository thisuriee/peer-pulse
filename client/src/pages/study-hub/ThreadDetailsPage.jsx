import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowUp,
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
  addReplyMutationFn,
  acceptReplyMutationFn,
  deleteThreadMutationFn,
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
const ReplyCard = ({ reply, isAuthor, isThreadResolved, onAccept, onUpvote }) => {
  const { _id, text, userId, isBestAnswer, createdAt, upvotes = [] } = reply;
  const authorName = userId?.name || "Unknown";
  const timeAgo = createdAt
    ? formatDistanceToNow(new Date(createdAt), { addSuffix: true })
    : "";

  return (
    <div
      id={`reply-${_id}`}
      className={cn(
        "bg-card border border-border rounded-xl p-5 transition-all duration-200",
        isBestAnswer &&
          "border-green-500/40 bg-green-500/5 dark:bg-green-900/10 shadow-sm shadow-green-500/10"
      )}
    >
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
          <span className="text-muted-foreground/50">·</span>
          <Clock size={11} className="shrink-0" />
          <span className="truncate">{timeAgo}</span>
        </div>
      </div>

      {/* Reply text */}
      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap mb-4">
        {text}
      </p>

      {/* Footer actions */}
      <div className="flex items-center justify-between gap-3">
        {/* Upvote count (display only on detail page) */}
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ArrowUp size={13} className="text-primary" />
          <span className="font-semibold">{upvotes?.length ?? 0}</span>
        </span>

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
          <span className="text-xs font-semibold text-green-600 dark:text-green-400 flex items-center gap-1.5">
            <CheckCircle2 size={13} />
            Accepted Answer
          </span>
        )}
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
  const [isUpvoted, setIsUpvoted] = useState(false);

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

  // ── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: upvote, isPending: upvoting } = useMutation({
    mutationFn: () => upvoteThreadMutationFn(id),
    onSuccess: (res) => {
      setIsUpvoted(res.data?.upvoted ?? !isUpvoted);
      queryClient.invalidateQueries({ queryKey: ["thread", id] });
    },
    onError: (err) =>
      toast({
        title: "Error",
        description: err?.message || "Could not upvote.",
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
    formState: { errors },
  } = useForm({
    resolver: zodResolver(replySchema),
    defaultValues: { text: "" },
  });

  const onSubmitReply = ({ text }) => {
    addReply({ threadId: id, text });
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
  const upvoteCount = upvotes.length;

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
            "bg-card border border-border rounded-xl p-6",
            isResolved && "border-l-4 border-l-green-500"
          )}
        >
          {/* Tags row */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              <BookOpen size={11} />
              {subject}
            </span>
            {isResolved && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                <CheckCircle2 size={11} />
                Resolved
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight mb-3">
            {title}
          </h1>

          {/* Author + date */}
          <div className="flex items-center gap-2.5 mb-5 pb-5 border-b border-border">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                {getInitials(authorId?.name)}
              </AvatarFallback>
            </Avatar>
            <div className="text-sm min-w-0">
              <span className="font-semibold text-foreground">
                {authorId?.name || "Unknown"}
              </span>
              <span className="text-muted-foreground text-xs ml-2">
                · {timeAgo}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="prose prose-sm dark:prose-invert max-w-none mb-6">
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {content}
            </p>
          </div>

          {/* Action bar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              {/* Upvote button */}
              <Button
                id="upvote-thread-btn"
                variant={isUpvoted ? "default" : "outline"}
                size="sm"
                onClick={() => upvote()}
                disabled={upvoting || !user}
                className="gap-2"
              >
                {upvoting ? (
                  <Loader size={14} className="animate-spin" />
                ) : (
                  <ArrowUp size={14} />
                )}
                <span className="font-semibold">{upvoteCount}</span>
                <span className="hidden sm:inline">
                  {upvoteCount === 1 ? "Upvote" : "Upvotes"}
                </span>
              </Button>

              {/* Reply count indicator */}
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground px-3">
                <MessageSquare size={14} />
                <span className="font-semibold">{replies.length}</span>
                <span className="hidden sm:inline">
                  {replies.length === 1 ? "Reply" : "Replies"}
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

        {/* ── Replies Section ─────────────────────────────────────────────── */}
        <div>
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
                  reply={reply}
                  isAuthor={isAuthor}
                  isThreadResolved={isResolved}
                  onAccept={(replyId) =>
                    acceptAnswer({ threadId: id, replyId })
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Add Reply Form ──────────────────────────────────────────────── */}
        {user ? (
          <div
            id="add-reply-section"
            className="bg-card border border-border rounded-xl p-5"
          >
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Send size={15} className="text-primary" />
              Your Reply
            </h3>

            <form onSubmit={handleSubmit(onSubmitReply)} className="space-y-3">
              <div>
                <textarea
                  id="reply-textarea"
                  rows={5}
                  placeholder="Share your knowledge or ask for clarification…"
                  {...register("text")}
                  disabled={replyPending || accepting}
                  className={cn(
                    "w-full px-3 py-2 rounded-md border text-sm bg-background resize-none",
                    "focus:outline-none focus:ring-1 focus:ring-ring",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "placeholder:text-muted-foreground",
                    errors.text ? "border-destructive" : "border-input"
                  )}
                />
                {errors.text && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.text.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end">
                <Button
                  id="submit-reply-btn"
                  type="submit"
                  size="sm"
                  disabled={replyPending || accepting}
                  className="gap-2 min-w-[110px]"
                >
                  {replyPending ? (
                    <>
                      <Loader size={14} className="animate-spin" />
                      Posting…
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      Post Reply
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-5 text-center">
            <p className="text-sm text-muted-foreground">
              <Link
                to="/"
                className="text-primary font-semibold hover:underline"
              >
                Sign in
              </Link>{" "}
              to join the discussion.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ThreadDetailsPage;
