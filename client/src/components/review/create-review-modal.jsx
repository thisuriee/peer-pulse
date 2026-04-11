import { useMemo, useState } from 'react';
import { Calendar, MessageSquareText, Star, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  useCreateReview,
  useDeleteReview,
  useUpdateReview,
} from '@/hooks/use-reviews';
import { cn } from '@/lib/utils';

function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function RatingStars({ value, onChange, disabled = false }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= value;
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            disabled={disabled}
            className={cn(
              'p-1 rounded-full transition-colors',
              disabled ? 'cursor-not-allowed opacity-70' : 'hover:bg-accent'
            )}
            aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
          >
            <Star
              className={cn(
                'w-5 h-5',
                active
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-muted-foreground/50'
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

export default function CreateReviewModal({
  open,
  onOpenChange,
  booking,
  existingReview = null,
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const { mutateAsync: createReview, isPending: isCreating } = useCreateReview();
  const { mutateAsync: updateReview, isPending: isUpdating } = useUpdateReview();
  const { mutateAsync: deleteReview, isPending: isDeleting } = useDeleteReview();

  const tutorName = booking?.tutor?.name ?? 'Tutor';
  const bookingId = booking?._id ?? booking?.id;
  const reviewId = existingReview?._id ?? existingReview?.id;
  const hasReview = !!existingReview;
  const isPending = isCreating || isUpdating || isDeleting;
  const isReadonly = hasReview && !isEditing;

  const canSubmit = useMemo(() => {
    if (isReadonly || isPending) return false;
    return Number.isInteger(rating) && rating >= 1 && rating <= 5 && !!bookingId;
  }, [isReadonly, rating, bookingId, isPending]);

  const startEdit = () => {
    if (!existingReview) return;
    setRating(existingReview.rating ?? 5);
    setComment(existingReview.comment ?? '');
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setRating(5);
    setComment('');
  };

  const handleOpenChange = (next) => {
    if (isPending) return;
    if (!next) {
      setRating(5);
      setComment('');
      setIsEditing(false);
    }
    onOpenChange(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      if (hasReview && reviewId) {
        await updateReview({
          reviewId,
          payload: {
            rating,
            comment: comment.trim() || undefined,
          },
        });
        toast({
          title: 'Review updated',
          description: `Your updated feedback for ${tutorName} has been saved.`,
        });
      } else {
        await createReview({
          bookingId,
          rating,
          comment: comment.trim() || undefined,
        });
        toast({
          title: 'Review submitted',
          description: `Thanks for reviewing ${tutorName}. Reputation score will update automatically.`,
        });
      }
      handleOpenChange(false);
    } catch (err) {
      toast({
        title: hasReview ? 'Could not update review' : 'Could not submit review',
        description: err?.message || 'Something went wrong.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!reviewId || isPending) return;

    try {
      await deleteReview(reviewId);
      toast({
        title: 'Review deleted',
        description: 'You can submit a new review for this session anytime.',
      });
      handleOpenChange(false);
    } catch (err) {
      toast({
        title: 'Could not delete review',
        description: err?.message || 'Something went wrong.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display uppercase tracking-wide">
            {hasReview ? (isEditing ? 'Edit Review' : 'Your Review') : 'Write a Review'}
          </DialogTitle>
          <DialogDescription>
            {isReadonly
              ? 'You already reviewed this session.'
              : `Share feedback for ${tutorName}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border-2 border-border bg-muted/35 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="font-medium">{tutorName}</span>
            <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded-full bg-muted border border-border">
              Tutor
            </span>
          </div>
          <p className="text-sm text-primary font-medium">{booking?.subject ?? 'Session'}</p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            {fmtDateTime(booking?.scheduledAt)}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Rating</Label>
            {isReadonly ? (
              <div className="flex items-center gap-2">
                <RatingStars value={existingReview?.rating ?? 0} onChange={() => {}} disabled />
                <span className="text-xs text-muted-foreground">
                  ({existingReview?.rating ?? 0}/5)
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <RatingStars value={rating} onChange={setRating} />
                <span className="text-xs text-muted-foreground">({rating}/5)</span>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reviewComment" className="flex items-center gap-1.5">
              <MessageSquareText className="w-3.5 h-3.5" />
              Comment
              <span className="text-muted-foreground font-normal text-xs">(optional)</span>
            </Label>
            <textarea
              id="reviewComment"
              rows={4}
              maxLength={1000}
              value={isReadonly ? existingReview?.comment ?? '' : comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={isReadonly || isPending}
              placeholder="How was your session? What helped most?"
              className={cn(
                'w-full rounded-2xl border-2 border-border bg-background px-4 py-2.5 text-sm resize-none',
                'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                'disabled:opacity-70'
              )}
            />
            {!isReadonly && (
              <p className="text-xs text-muted-foreground/70 text-right">
                {comment.length}/1000
              </p>
            )}
          </div>

          <DialogFooter>
            {hasReview && !isEditing && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isPending}
                className="sm:mr-auto"
              >
                {isDeleting ? 'Deleting…' : 'Delete Review'}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (hasReview && isEditing) {
                  cancelEdit();
                  return;
                }
                handleOpenChange(false);
              }}
              disabled={isPending}
            >
              {hasReview && isEditing ? 'Cancel Edit' : isReadonly ? 'Close' : 'Cancel'}
            </Button>
            {hasReview && !isEditing && (
              <Button type="button" onClick={startEdit} disabled={isPending}>
                Edit Review
              </Button>
            )}
            {!isReadonly && (
              <Button type="submit" disabled={!canSubmit || isPending}>
                {isCreating
                  ? 'Submitting…'
                  : isUpdating
                    ? 'Saving…'
                    : hasReview
                      ? 'Save Changes'
                      : 'Submit Review'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

