import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUp, ArrowDown, MessageSquare, CheckCircle2, Clock, BookOpen, Share2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { upvoteThreadMutationFn, downvoteThreadMutationFn } from "@/lib/thread-api";
import { useAuthContext } from "@/context/auth-provider";
import { toast } from "@/hooks/use-toast";

/**
 * @param {{
 *   thread: {
 *     _id: string,
 *     title: string,
 *     content: string,
 *     subject: string,
 *     authorId: { name: string, email: string },
 *     upvotes: string[],
 *     replies: object[],
 *     isResolved: boolean,
 *     createdAt: string,
 *   }
 * }} props
 */
const ThreadCard = ({ thread }) => {
  const {
    _id,
    title,
    content,
    subject,
    authorId,
    upvotes = [],
    replies = [],
    isResolved,
    createdAt,
  } = thread;

  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const isUpvoted = user && upvotes.includes(user._id);

  const { mutate: toggleUpvote, isPending: upvoting } = useMutation({
    mutationFn: () => upvoteThreadMutationFn(_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
    },
    onError: (err) => {
      toast({
        title: "Error",
        description: err?.message || "Could not upvote.",
        variant: "destructive",
      });
    },
  });

  const { mutate: toggleDownvote, isPending: downvoting } = useMutation({
    mutationFn: () => downvoteThreadMutationFn(_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
    },
    onError: (err) => {
      toast({
        title: "Error",
        description: err?.message || "Could not downvote.",
        variant: "destructive",
      });
    },
  });

  const handleUpvote = (e) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Authentication required", description: "You must be signed in to upvote." });
      return;
    }
    toggleUpvote();
  };

  const handleDownvote = (e) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Authentication required", description: "You must be signed in to downvote." });
      return;
    }
    toggleDownvote();
  };

  const authorName = authorId?.name || "Unknown";
  const initials = authorName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const timeAgo = createdAt
    ? formatDistanceToNow(new Date(createdAt), { addSuffix: true })
    : "";

  const snippet =
    content?.length > 150 ? content.slice(0, 150) + "…" : content;

  return (
    <div
      id={`thread-card-${_id}`}
      className={cn(
        "flex flex-row gap-3 sm:gap-4 bg-card border border-border rounded-xl p-4 sm:p-5 transition-all duration-200",
        "hover:border-primary/40 hover:shadow-sm",
        isResolved && "border-l-4 border-l-green-500"
      )}
    >
      {/* Left Column: Votes */}
      <div className="flex flex-col items-center gap-1 sm:px-1 shrink-0">
        <button 
          onClick={handleUpvote}
          disabled={upvoting}
          className={cn(
            "p-1 sm:p-1.5 rounded-md transition-colors focus:ring-2 focus:ring-primary focus:outline-none",
            isUpvoted 
              ? "bg-primary/20 text-primary hover:bg-primary/30" 
              : "text-muted-foreground hover:bg-primary/10 hover:text-primary",
            (!user || upvoting) && "opacity-50 cursor-not-allowed"
          )}
          aria-label="Upvote"
        >
          <ArrowUp size={20} strokeWidth={2.5} />
        </button>
        <span className="font-semibold text-sm text-foreground my-0.5">
          {upvotes.length}
        </span>
        <button 
          onClick={handleDownvote}
          disabled={downvoting}
          className={cn(
             "p-1 sm:p-1.5 rounded-md text-muted-foreground transition-colors focus:ring-2 focus:ring-destructive focus:outline-none",
             (!user || downvoting) ? "opacity-50 cursor-not-allowed" : "hover:bg-destructive/10 hover:text-destructive"
          )}
          aria-label="Downvote"
        >
          <ArrowDown size={20} strokeWidth={2.5} />
        </button>
      </div>

      {/* Right Column: Content */}
      <div className="flex-1 min-w-0 flex flex-col pt-1 sm:pt-1.5">
        <Link
          to={`/study-hub/${_id}`}
          className="block group focus:outline-none"
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
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

              <h3 className="text-base sm:text-[17px] font-semibold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
                {title}
              </h3>
            </div>
          </div>

          {snippet && (
            <p className="text-[14px] text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
              {snippet}
            </p>
          )}
        </Link>

        {/* Action Footer */}
        <div className="flex items-center justify-between gap-2 border-t pt-3 mt-auto">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-6 w-6 shrink-0">
              <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-[13px] text-muted-foreground font-medium truncate">
              {authorName}
            </span>
            <span className="text-muted-foreground/50 text-xs hidden sm:inline">·</span>
            <span className="items-center gap-1.5 text-[13px] text-muted-foreground hidden sm:inline-flex">
              <Clock size={13} />
              {timeAgo}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Link
              to={`/study-hub/${_id}#comments`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-colors"
            >
              <MessageSquare size={16} />
              <span>{replies.length} <span className="hidden sm:inline">Comments</span></span>
            </Link>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-colors focus:ring-2 focus:ring-secondary focus:outline-none">
              <Share2 size={16} />
              <span className="hidden sm:inline">Share</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThreadCard;
