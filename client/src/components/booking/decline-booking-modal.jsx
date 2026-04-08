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
import { useDeclineBooking } from '@/hooks/use-bookings';
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

export default function DeclineBookingModal({ open, onOpenChange, booking }) {
  const [reason, setReason] = useState('');
  const { mutateAsync, isPending } = useDeclineBooking();
  const { toast } = useToast();

  const studentName = booking?.student?.name ?? 'Unknown';
  const canSubmit = reason.trim().length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      await mutateAsync({ id: booking._id, data: { reason: reason.trim() } });
      toast({ title: 'Booking declined', description: `Session with ${studentName} was declined.` });
      onOpenChange(false);
      setReason('');
    } catch (err) {
      toast({
        title: 'Failed to decline',
        description: err?.response?.data?.message ?? 'Something went wrong.',
        variant: 'destructive',
      });
    }
  };

  const handleOpenChange = (next) => {
    if (!isPending) {
      if (!next) setReason('');
      onOpenChange(next);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Decline Booking</DialogTitle>
          <DialogDescription>Let {studentName} know why you can't accept this session.</DialogDescription>
        </DialogHeader>

        {/* Booking summary */}
        <div className="rounded-xl border-2 border-border bg-muted/40 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="font-medium">{studentName}</span>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reason">
              Reason for declining
              <span className="text-destructive ml-0.5">*</span>
            </Label>
            <textarea
              id="reason"
              rows={3}
              placeholder="E.g. I'm unavailable at this time…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
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
              {isPending ? 'Declining…' : 'Decline Booking'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
