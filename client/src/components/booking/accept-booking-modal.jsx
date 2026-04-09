import { useState } from 'react';
import { Calendar, Clock, User, Link2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAcceptBooking } from '@/hooks/use-bookings';
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

export default function AcceptBookingModal({ open, onOpenChange, booking }) {
  const [meetingLink, setMeetingLink] = useState('');
  const { mutateAsync, isPending } = useAcceptBooking();
  const { toast } = useToast();

  const studentName = booking?.student?.name ?? 'Unknown';

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await mutateAsync({ id: booking._id, data: { meetingLink: meetingLink.trim() || undefined } });
      toast({ title: 'Booking accepted', description: `Session with ${studentName} confirmed.` });
      onOpenChange(false);
      setMeetingLink('');
    } catch (err) {
      toast({
        title: 'Failed to accept',
        description: err?.response?.data?.message ?? 'Something went wrong.',
        variant: 'destructive',
      });
    }
  };

  const handleOpenChange = (next) => {
    if (!isPending) {
      if (!next) setMeetingLink('');
      onOpenChange(next);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Accept Booking</DialogTitle>
          <DialogDescription>Confirm this session request from {studentName}.</DialogDescription>
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
            <Label htmlFor="meetingLink" className="flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5" />
              Meeting Link
              <span className="text-xs text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="meetingLink"
              type="url"
              placeholder="https://zoom.us/j/… or meet.google.com/…"
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              disabled={isPending}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Accepting…' : 'Accept Booking'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
