import { useState, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { Loader2, CalendarDays, Clock, BookOpen } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAvailableSlots, useCreateBooking } from '@/hooks/use-bookings';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ─── Constants ────────────────────────────────────────────────────────────────

const FALLBACK_DURATIONS = [30, 60, 90];

// ─── Small helpers ────────────────────────────────────────────────────────────

/** Format an ISO slot time to "9:00 AM" using the browser's local timezone. */
function fmtSlotTime(isoString) {
  return format(new Date(isoString), 'h:mm a');
}

/** Tomorrow's date in YYYY-MM-DD, the minimum selectable date. */
function getTomorrowStr() {
  return format(addDays(new Date(), 1), 'yyyy-MM-dd');
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldLabel({ children }) {
  return (
    <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">
      {children}
    </p>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * BookingRequestModal — students use this to request a tutoring session.
 *
 * @param {Object}        props
 * @param {boolean}       props.open          - Controls Dialog open state
 * @param {Function}      props.onOpenChange  - Called when Dialog requests open state change
 * @param {Object|null}   props.tutor         - Tutor object from GET /bookings/tutors:
 *                                              { _id, name, skills[], bio, reputationScore,
 *                                                availability: { subjects[], sessionDurations[], isActive } | null }
 */
export default function BookingRequestModal({ open, onOpenChange, tutor }) {
  const { toast } = useToast();

  // ── Form state ──────────────────────────────────────────────────────────────
  const [subject, setSubject] = useState('');
  const [duration, setDuration] = useState(60);
  const [date, setDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [description, setDescription] = useState('');
  const [submitError, setSubmitError] = useState('');

  // Reset entire form when modal closes
  useEffect(() => {
    if (!open) {
      setSubject('');
      setDuration(60);
      setDate('');
      setSelectedSlot(null);
      setDescription('');
      setSubmitError('');
    }
  }, [open]);

  // Reset selected slot whenever date or duration changes — the slot list changes
  useEffect(() => {
    setSelectedSlot(null);
  }, [date, duration]);

  // ── Data ────────────────────────────────────────────────────────────────────

  // Subject options: prefer the user's skills array (what the tutor teaches),
  // fall back to the availability model's subjects field.
  const subjectOptions =
    tutor?.skills?.length > 0
      ? tutor.skills
      : (tutor?.availability?.subjects ?? []);

  // Duration options: use what the tutor explicitly offers; fall back to common values.
  const durationOptions =
    tutor?.availability?.sessionDurations?.length > 0
      ? [...tutor.availability.sessionDurations].sort((a, b) => a - b)
      : FALLBACK_DURATIONS;

  // Slots: enabled only when all three params are truthy.
  // date must be YYYY-MM-DD (native date input already returns this format).
  const {
    data: slots = [],
    isLoading: isLoadingSlots,
    isFetching: isFetchingSlots,
  } = useAvailableSlots(tutor?._id, date, duration);

  const { mutateAsync: createBooking, isPending } = useCreateBooking();

  // ── Submit ──────────────────────────────────────────────────────────────────

  const canSubmit = !!subject && !!date && !!selectedSlot && !isPending;

  const handleSubmit = async () => {
    if (!canSubmit || !tutor) return;
    setSubmitError('');

    try {
      // The slot's startTime is already an ISO 8601 datetime string — pass directly.
      // createBookingSchema validates: z.string().datetime()
      await createBooking({
        tutor: tutor._id,
        subject,
        scheduledAt: selectedSlot.startTime,
        duration,
        description: description.trim() || undefined,
      });

      toast({
        title: 'Session requested!',
        description: `Your request has been sent to ${tutor.name}. They will accept or decline shortly.`,
      });

      onOpenChange(false);
    } catch (err) {
      setSubmitError(err.message || 'Failed to create booking. Please try again.');
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/*
       * max-h-[90vh] + overflow-y-auto: the form can be tall (slots grid pushes it)
       * so the whole DialogContent scrolls within the viewport.
       */}
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary shrink-0" />
            Book a session
          </DialogTitle>
          <DialogDescription>
            with <span className="font-medium text-foreground">{tutor?.name ?? 'this tutor'}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* ── 1. Subject ──────────────────────────────────────────────── */}
          <div>
            <FieldLabel>Subject</FieldLabel>
            {subjectOptions.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                This tutor has not listed any subjects.
              </p>
            ) : (
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={cn(
                  'flex h-10 w-full rounded-full border-2 border-input bg-background',
                  'px-4 py-2 text-sm text-foreground shadow-sm transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  !subject && 'text-muted-foreground',
                )}
              >
                <option value="" disabled>
                  Choose a subject…
                </option>
                {subjectOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* ── 2. Duration ─────────────────────────────────────────────── */}
          <div>
            <FieldLabel>Session length</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {durationOptions.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={cn(
                    'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold',
                    'border-2 transition-colors',
                    duration === d
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground',
                  )}
                >
                  <Clock className="w-3 h-3" />
                  {d} min
                </button>
              ))}
            </div>
          </div>

          {/* ── 3. Date picker ──────────────────────────────────────────── */}
          <div>
            <FieldLabel>Date</FieldLabel>
            <div className="relative">
              <CalendarDays className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="date"
                value={date}
                min={getTomorrowStr()}
                onChange={(e) => setDate(e.target.value)}
                className={cn(
                  'flex h-10 w-full rounded-full border-2 border-input bg-background',
                  'pl-9 pr-4 py-2 text-sm text-foreground shadow-sm transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  !date && 'text-muted-foreground',
                )}
              />
            </div>
          </div>

          {/* ── 4. Time slot grid ───────────────────────────────────────── */}
          <div>
            <FieldLabel>Available time slots</FieldLabel>

            {!date ? (
              <p className="text-xs text-muted-foreground italic">
                Select a date above to see available slots.
              </p>
            ) : isLoadingSlots || isFetchingSlots ? (
              <div className="flex items-center gap-2 py-4 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">Checking availability…</span>
              </div>
            ) : slots.length === 0 ? (
              <div className="py-4 text-center">
                <Clock className="w-6 h-6 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">
                  No slots available for this date and duration.
                </p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  Try a different date or session length.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot.startTime}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={cn(
                      'py-2 px-1 rounded-xl border-2 text-xs font-semibold transition-colors',
                      selectedSlot?.startTime === slot.startTime
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-foreground border-border hover:border-primary/50 hover:bg-primary/5',
                    )}
                  >
                    {fmtSlotTime(slot.startTime)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── 5. Description ──────────────────────────────────────────── */}
          <div>
            <FieldLabel>
              What do you need help with?{' '}
              <span className="normal-case font-normal text-muted-foreground">(optional)</span>
            </FieldLabel>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="e.g. Struggling with integration by parts, need help with practice problems…"
              className={cn(
                'flex w-full rounded-2xl border-2 border-input bg-background',
                'px-4 py-2.5 text-sm text-foreground shadow-sm transition-colors resize-none',
                'placeholder:text-muted-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                'disabled:cursor-not-allowed disabled:opacity-50',
              )}
            />
            <p className="text-xs text-muted-foreground/60 text-right mt-1">
              {description.length}/500
            </p>
          </div>

          {/* ── Error message ────────────────────────────────────────────── */}
          {submitError && (
            <p className="text-xs font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
              {submitError}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Requesting…
              </>
            ) : (
              'Request Session'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
