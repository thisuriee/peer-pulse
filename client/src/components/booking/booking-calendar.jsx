import { useState, useRef, useEffect } from 'react';
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  addWeeks,
  subWeeks,
  isSameDay,
  parseISO,
} from 'date-fns';
import { ChevronLeft, ChevronRight, X, User, Clock, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BookingStatusBadge from './booking-status-badge';
import { useBookings } from '@/hooks/use-bookings';

// ─── Constants ────────────────────────────────────────────────────────────────

const HOUR_START = 8;   // 8 AM
const HOUR_END = 20;    // 8 PM  (exclusive — last slot starts at 7 PM)
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
const ROW_HEIGHT = 64;  // px per hour

const STATUS_CHIP = {
  pending:   'bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-950/60 dark:border-yellow-700 dark:text-yellow-300',
  accepted:  'bg-green-100 border-green-300 text-green-800 dark:bg-green-950/60 dark:border-green-700 dark:text-green-300',
  confirmed: 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-950/60 dark:border-blue-700 dark:text-blue-300',
  completed: 'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-700 dark:text-emerald-300',
  cancelled: 'bg-gray-100 border-gray-300 text-gray-500 dark:bg-gray-800/60 dark:border-gray-600 dark:text-gray-400',
  declined:  'bg-gray-100 border-gray-300 text-gray-500 dark:bg-gray-800/60 dark:border-gray-600 dark:text-gray-400',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(iso) {
  if (!iso) return '—';
  return format(parseISO(iso), 'h:mm a');
}

function fmtDuration(minutes) {
  if (!minutes) return '—';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** Returns top offset (px) and height (px) for a booking block within a day column. */
function chipGeometry(scheduledAt, duration = 60) {
  const date = parseISO(scheduledAt);
  const totalMinutesFromStart = (date.getHours() - HOUR_START) * 60 + date.getMinutes();
  const top = (totalMinutesFromStart / 60) * ROW_HEIGHT;
  const height = Math.max((duration / 60) * ROW_HEIGHT, 24); // min 24px
  return { top, height };
}

/** Checks whether a booking falls (at least partially) within the visible 8AM–8PM window. */
function isInWindow(scheduledAt) {
  if (!scheduledAt) return false;
  const h = parseISO(scheduledAt).getHours();
  return h >= HOUR_START && h < HOUR_END;
}

// ─── Booking chip ─────────────────────────────────────────────────────────────

function BookingChip({ booking, role, columnIndex, totalColumns }) {
  const [open, setOpen] = useState(false);
  const chipRef = useRef(null);

  const isTutor = role === 'tutor';
  const peer = isTutor ? booking.student : booking.tutor;
  const peerName = peer?.name ?? 'Unknown';
  const status = booking.status?.toLowerCase() ?? 'pending';
  const chipCls = STATUS_CHIP[status] ?? STATUS_CHIP.pending;

  const { top, height } = chipGeometry(booking.scheduledAt, booking.duration);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (chipRef.current && !chipRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Decide whether the popover should open to the left or right
  // Columns 4-6 (Fri-Sun) open to the left; others open to the right
  const openLeft = columnIndex >= 4;

  return (
    <div
      ref={chipRef}
      className="absolute inset-x-0.5 z-10"
      style={{ top, height }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className={`
          w-full h-full rounded-lg border px-1.5 text-left overflow-hidden
          transition-opacity hover:opacity-90 active:opacity-75
          ${chipCls}
        `}
      >
        <p className="text-[10px] font-semibold leading-tight truncate">{booking.subject}</p>
        {height >= 40 && (
          <p className="text-[10px] leading-tight truncate opacity-80">{peerName}</p>
        )}
      </button>

      {/* Popover */}
      {open && (
        <div
          className={`
            absolute top-0 z-50 w-56
            bg-background border-2 border-border rounded-2xl shadow-lg p-3
            ${openLeft ? 'right-full mr-2' : 'left-full ml-2'}
          `}
        >
          <button
            onClick={() => setOpen(false)}
            className="absolute top-2 right-2 p-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <p className="text-sm font-semibold pr-5 leading-snug mb-2">{booking.subject}</p>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User className="w-3 h-3 shrink-0" />
              <span className="truncate">{peerName}</span>
              <span className="ml-auto text-[10px] opacity-70">{isTutor ? 'Student' : 'Tutor'}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3 shrink-0" />
              <span>{fmtTime(booking.scheduledAt)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3 shrink-0" />
              <span>{fmtDuration(booking.duration)}</span>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-border flex items-center justify-between">
            <BookingStatusBadge status={booking.status} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CalendarSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      <div className="h-8 w-64 rounded-lg bg-muted mx-auto" />
      <div className="h-[520px] rounded-2xl bg-muted" />
    </div>
  );
}

// ─── Main calendar ────────────────────────────────────────────────────────────

/**
 * @param {{ role: 'student' | 'tutor' }} props
 */
export default function BookingCalendar({ role = 'student' }) {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Fetch all bookings for this week (no pagination needed)
  const startDate = format(weekStart, 'yyyy-MM-dd');
  const endDate = format(weekEnd, 'yyyy-MM-dd');

  const { data: bookingsData, isLoading } = useBookings({
    startDate,
    endDate,
    limit: 200,
  });

  const allBookings = bookingsData?.bookings ?? [];

  // Group bookings by day
  const bookingsByDay = days.map((day) =>
    allBookings.filter((b) => {
      if (!b.scheduledAt) return false;
      return isSameDay(parseISO(b.scheduledAt), day) && isInWindow(b.scheduledAt);
    }),
  );

  const weekLabel = `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'd, yyyy')}`;
  const totalHeight = HOURS.length * ROW_HEIGHT;

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setWeekStart((w) => subWeeks(w, 1))}
          className="gap-1.5"
        >
          <ChevronLeft className="w-4 h-4" />
          Prev Week
        </Button>
        <span className="text-sm font-semibold">{weekLabel}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setWeekStart((w) => addWeeks(w, 1))}
          className="gap-1.5"
        >
          Next Week
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {isLoading ? (
        <CalendarSkeleton />
      ) : (
        <div className="rounded-2xl border-2 border-border overflow-hidden bg-card">
          {/* Day header row */}
          <div className="flex border-b-2 border-border bg-muted/40">
            {/* Gutter for time labels */}
            <div className="w-14 shrink-0 border-r border-border" />
            {days.map((day, i) => {
              const isToday = isSameDay(day, new Date());
              return (
                <div
                  key={i}
                  className="flex-1 min-w-0 py-2 text-center border-r border-border last:border-r-0"
                >
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    {format(day, 'EEE')}
                  </p>
                  <p
                    className={`text-sm font-bold mt-0.5 mx-auto w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
                      isToday
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground'
                    }`}
                  >
                    {format(day, 'd')}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Scrollable time grid */}
          <div className="overflow-y-auto max-h-[560px]">
            <div className="flex" style={{ height: totalHeight }}>
              {/* Time labels gutter */}
              <div className="w-14 shrink-0 border-r border-border relative">
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="absolute right-0 pr-2 flex items-start justify-end"
                    style={{ top: (h - HOUR_START) * ROW_HEIGHT - 8, height: ROW_HEIGHT }}
                  >
                    <span className="text-[10px] text-muted-foreground font-medium leading-none mt-1.5">
                      {format(new Date(2000, 0, 1, h), 'haaa')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {days.map((day, colIdx) => (
                <div
                  key={colIdx}
                  className="flex-1 min-w-0 relative border-r border-border last:border-r-0"
                  style={{ height: totalHeight }}
                >
                  {/* Hour grid lines */}
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      className="absolute inset-x-0 border-t border-border/50"
                      style={{ top: (h - HOUR_START) * ROW_HEIGHT }}
                    />
                  ))}

                  {/* "Now" indicator — only show on today's column */}
                  {isSameDay(day, new Date()) && (() => {
                    const now = new Date();
                    const nowMinutes = (now.getHours() - HOUR_START) * 60 + now.getMinutes();
                    if (nowMinutes < 0 || nowMinutes > (HOUR_END - HOUR_START) * 60) return null;
                    const top = (nowMinutes / 60) * ROW_HEIGHT;
                    return (
                      <div
                        className="absolute inset-x-0 z-20 pointer-events-none"
                        style={{ top }}
                      >
                        <div className="h-0.5 bg-primary" />
                        <div className="absolute -left-1 -top-1.5 w-2.5 h-2.5 rounded-full bg-primary" />
                      </div>
                    );
                  })()}

                  {/* Booking chips */}
                  {bookingsByDay[colIdx].map((booking) => (
                    <BookingChip
                      key={booking._id ?? booking.id}
                      booking={booking}
                      role={role}
                      columnIndex={colIdx}
                      totalColumns={7}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 justify-end text-xs text-muted-foreground">
        {[
          { label: 'Pending', cls: 'bg-yellow-100 border-yellow-300 dark:bg-yellow-950/60 dark:border-yellow-700' },
          { label: 'Confirmed', cls: 'bg-blue-100 border-blue-300 dark:bg-blue-950/60 dark:border-blue-700' },
          { label: 'Completed', cls: 'bg-emerald-100 border-emerald-300 dark:bg-emerald-950/60 dark:border-emerald-700' },
        ].map(({ label, cls }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded border ${cls}`} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
