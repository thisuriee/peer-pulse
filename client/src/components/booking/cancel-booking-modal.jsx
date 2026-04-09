import { useState } from 'react';
import { Calendar, Clock, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useCancelBooking } from '@/hooks/use-bookings';
import { useToast } from '@/hooks/use-toast';

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

function BookingSummary({ booking, role }) {
  const isTutor = role === 'tutor';
  const peer = isTutor ? booking?.student : booking?.tutor;
  const peerName = peer?.name ?? 'Unknown';
  const peerLabel = isTutor ? 'Student' : 'Tutor';

  return (
    <div className="rounded-xl border-2 border-border bg-muted/40 p-4 space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="font-medium">{peerName}</span>
        <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded-full bg-muted border border-border">
          {peerLabel}
        </span>
      </div>
      <div className="flex items-center gap-2 text-sm text-primary font-medium">
        <span className="w-3.5 h-3.5 shrink-0" />
        {booking?.subject}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          {fmtDateTime(booking?.scheduledAt)}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          {fmtDuration(booking?.duration)}
        </span>
      </div>
    </div>
  );
}

/**
 * @param {{ open: boolean, onOpenChange: function, booking: object, role: 'student'|'tutor' }} props
 */
export default function CancelBookingModal({ open, onOpenChange, booking, role = 'student' }) {
  const [cancelReason, setCancelReason] = useState('');
  const { mutateAsync, isPending } = useCancelBooking();
  const { toast } = useToast();

  const canSubmit = cancelReason.trim().length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      await mutateAsync({ id: booking._id, data: { cancelReason: cancelReason.trim() } });
      toast({ title: 'Booking cancelled', description: 'The session has been cancelled.' });
      onOpenChange(false);
      setCancelReason('');
    } catch (err) {
      toast({
        title: 'Failed to cancel',
        description: err?.response?.data?.message ?? 'Something went wrong.',
        variant: 'destructive',
      });
    }
  };

  const handleOpenChange = (next) => {
    if (!isPending) {
      if (!next) setCancelReason('');
      onOpenChange(next);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Booking</DialogTitle>
          <DialogDescription>
            This action cannot be undone. Please provide a reason.
          </DialogDescription>
        </DialogHeader>

        <BookingSummary booking={booking} role={role} />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cancelReason">
              Reason for cancellation
              <span className="text-destructive ml-0.5">*</span>
            </Label>
            <textarea
              id="cancelReason"
              rows={3}
              placeholder="E.g. Change of plans, schedule conflict…"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              disabled={isPending}
              required
              className="w-full rounded-xl border-2 border-border bg-background px-3 py-2 text-sm resize-none placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 transition-colors"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Go Back
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={!canSubmit || isPending}
            >
              {isPending ? 'Cancelling…' : 'Cancel Booking'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
