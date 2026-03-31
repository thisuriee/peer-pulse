import { Link } from "react-router-dom";
import { ArrowUp, MessageSquare, CheckCircle2, Clock, BookOpen } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

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
    <Link
      to={`/study-hub/${_id}`}
      id={`thread-card-${_id}`}
      className="block group focus:outline-none"
    >
      <div
        className={cn(
          "relative bg-card border border-border rounded-xl p-5 transition-all duration-200",
          "hover:border-primary/40 hover:shadow-md hover:shadow-primary/5",
          "group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2",
          isResolved && "border-l-4 border-l-green-500"
        )}
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {/* Subject tag */}
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                <BookOpen size={11} />
                {subject}
              </span>

              {isResolved && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                  <CheckCircle2 size={11} />
                  Resolved
                </span>
              )}
            </div>

            <h3 className="text-base font-semibold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
              {title}
            </h3>
          </div>
        </div>

        {/* Content snippet */}
        {snippet && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
            {snippet}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2">
          {/* Author */}
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-6 w-6 shrink-0">
              <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground font-medium truncate">
              {authorName}
            </span>
            <span className="text-muted-foreground/50 text-xs hidden sm:inline">·</span>
            <span className="items-center gap-1 text-xs text-muted-foreground/70 hidden sm:inline-flex">
              <Clock size={11} />
              {timeAgo}
            </span>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ArrowUp size={13} className="text-primary" />
              <span className="font-semibold">{upvotes.length}</span>
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MessageSquare size={13} />
              <span className="font-semibold">{replies.length}</span>
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ThreadCard;
