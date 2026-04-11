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
import { useCompleteBooking } from '@/hooks/use-bookings';
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

/**
 * @param {{ open: boolean, onOpenChange: function, booking: object }} props
 */
export default function CompleteBookingModal({ open, onOpenChange, booking }) {
  const { mutateAsync, isPending } = useCompleteBooking();
  const { toast } = useToast();

  const bookingId = booking?._id ?? booking?.id;
  const student = booking?.student;

  const handleConfirm = async () => {
    try {
      await mutateAsync(bookingId);
      toast({ title: 'Session completed', description: 'The session has been marked as complete.' });
      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'Failed to complete session',
        description: err?.response?.data?.message ?? 'Something went wrong.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !isPending && onOpenChange(v)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark Session as Complete</DialogTitle>
          <DialogDescription>
            Confirm that this session has been completed. The student will be able to leave a review.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border-2 border-border bg-muted/40 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="font-medium">{student?.name ?? 'Unknown'}</span>
            <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded-full bg-muted border border-border">
              Student
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

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? 'Completing…' : 'Mark Complete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
