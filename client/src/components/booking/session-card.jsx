import { useMemo, useState } from 'react';
import { Calendar, Clock, MessageSquareText, User, Video, CalendarCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BookingStatusBadge from './booking-status-badge';
import AcceptBookingModal from './accept-booking-modal';
import DeclineBookingModal from './decline-booking-modal';
import CancelBookingModal from './cancel-booking-modal';
import CreateReviewModal from '@/components/review/create-review-modal';
import CompleteBookingModal from './complete-booking-modal';
import { useMyReviews } from '@/hooks/use-reviews';
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

function fmtDuration(minutes) {
  if (!minutes) return '—';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function initials(name = '') {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function Avatar({ name }) {
  return (
    <div className="w-10 h-10 rounded-full bg-primary/15 text-primary font-semibold text-sm flex items-center justify-center shrink-0">
      {initials(name)}
    </div>
  );
}

/**
 * @param {{
 *   booking: object,
 *   role: 'student' | 'tutor',
 * }} props
 */
export default function SessionCard({ booking, role }) {
  const [modal, setModal] = useState(null); // 'accept' | 'decline' | 'cancel' | 'review' | null

  const isTutor = role === 'tutor';
  const peer = isTutor ? booking.student : booking.tutor;
  const peerName = peer?.name ?? 'Unknown';
  const peerLabel = isTutor ? 'Student' : 'Tutor';
  const status = booking.status?.toLowerCase();
  const bookingId = booking?._id ?? booking?.id;

  const { data: myReviews = [] } = useMyReviews(!isTutor);

  const existingReview = useMemo(() => {
    if (isTutor || !bookingId) return null;
    return myReviews.find((r) => {
      const reviewBookingId =
        (typeof r?.booking === 'string' ? r.booking : r?.booking?._id) ?? null;
      return reviewBookingId?.toString() === bookingId.toString();
    }) ?? null;
  }, [myReviews, bookingId, isTutor]);

  const sessionStarted = useMemo(() => {
    if (!booking?.scheduledAt) return false;
    return new Date(booking.scheduledAt) <= new Date();
  }, [booking?.scheduledAt]);

  const canReview =
    !isTutor &&
    (status === 'completed' || ((status === 'accepted' || status === 'confirmed') && sessionStarted));

  // ── Action buttons ────────────────────────────────────────────────────────────
  let actions = null;

  if (status === 'pending') {
    if (!isTutor) {
      actions = (
        <Button
          size="sm"
          variant="outline"
          className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setModal('cancel')}
        >
          Cancel
        </Button>
      );
    } else {
      actions = (
        <>
          <Button
            size="sm"
            variant="default"
            onClick={() => setModal('accept')}
          >
            Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setModal('decline')}
          >
            Decline
          </Button>
        </>
      );
    }
  } else if (status === 'accepted' || status === 'confirmed') {
    if (!isTutor) {
      actions = (
        <>
          <Button
            size="sm"
            variant="outline"
            className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setModal('cancel')}
          >
            Cancel
          </Button>
          {canReview && (
            <Button
              size="sm"
              variant={existingReview ? 'outline' : 'default'}
              className={cn(
                'gap-1.5',
                existingReview && 'border-primary/40 text-primary hover:bg-primary/10'
              )}
              onClick={() => setModal('review')}
            >
              <MessageSquareText className="w-3.5 h-3.5" />
              {existingReview ? 'View Review' : 'Write Review'}
            </Button>
          )}
        </>
      );
    } else {
      actions = (
        <>
          <Button
            size="sm"
            variant="outline"
            className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setModal('cancel')}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={() => setModal('complete')}
          >
            Mark Complete
          </Button>
        </>
      );
    }
  } else if (status === 'completed' && !isTutor && canReview) {
    actions = (
      <Button
        size="sm"
        variant={existingReview ? 'outline' : 'default'}
        className={cn(
          'gap-1.5',
          existingReview && 'border-primary/40 text-primary hover:bg-primary/10'
        )}
        onClick={() => setModal('review')}
      >
        <MessageSquareText className="w-3.5 h-3.5" />
        {existingReview ? 'View Review' : 'Write Review'}
      </Button>
    );
  }

  return (
    <>
      <div
        className={cn(
          'rounded-2xl border-2 border-border bg-card p-4 sm:p-5',
          'flex flex-col sm:flex-row sm:items-start gap-4',
          'hover:border-primary/30 transition-colors',
        )}
      >
        {/* Avatar + peer info */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Avatar name={peerName} />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold truncate">{peerName}</p>
              <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded-full bg-muted border border-border flex items-center gap-1">
                <User className="w-2.5 h-2.5" />
                {peerLabel}
              </span>
              <BookingStatusBadge status={booking.status} />
            </div>
            <p className="text-sm text-primary font-medium mt-0.5 truncate">{booking.subject}</p>

            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                {fmtDateTime(booking.scheduledAt)}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                {fmtDuration(booking.duration)}
              </span>
              {booking.googleCalendarEventId && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                  <CalendarCheck className="w-3.5 h-3.5 shrink-0" />
                  On Google Calendar
                </span>
              )}
            </div>
            {booking.meetingLink && (status === 'accepted' || status === 'confirmed') && (
              <a
                href={booking.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-2 text-xs text-primary font-medium hover:underline"
              >
                <Video className="w-3.5 h-3.5 shrink-0" />
                Join Meeting
              </a>
            )}
            {canReview && (
              <div className="mt-2">
                {existingReview ? (
                  <p className="text-xs text-primary font-medium">
                    Review submitted: {existingReview.rating}/5
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    You can now review this tutor.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        {actions && (
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
            {actions}
          </div>
        )}
      </div>

      {/* Modals */}
      <AcceptBookingModal
        open={modal === 'accept'}
        onOpenChange={(v) => !v && setModal(null)}
        booking={booking}
      />
      <DeclineBookingModal
        open={modal === 'decline'}
        onOpenChange={(v) => !v && setModal(null)}
        booking={booking}
      />
      <CancelBookingModal
        open={modal === 'cancel'}
        onOpenChange={(v) => !v && setModal(null)}
        booking={booking}
        role={role}
      />
      <CreateReviewModal
        open={modal === 'review'}
        onOpenChange={(v) => !v && setModal(null)}
        booking={booking}
        existingReview={existingReview}
      />

      <CompleteBookingModal
        open={modal === 'complete'}
        onOpenChange={(v) => !v && setModal(null)}
        booking={booking}
      />
    </>
  );
}
