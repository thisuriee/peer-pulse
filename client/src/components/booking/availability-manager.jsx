import { useState, useEffect } from 'react';
import { AlertTriangle, Plus, X, Save, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  useAvailability,
  useUpdateAvailability,
  useAddDateOverride,
  useRemoveDateOverride,
} from '@/hooks/use-bookings';
import { useToast } from '@/hooks/use-toast';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const DURATION_OPTIONS = [
  { label: '30 min', value: 30 },
  { label: '60 min', value: 60 },
  { label: '90 min', value: 90 },
];

const DEFAULT_SLOT = { enabled: false, startTime: '09:00', endTime: '17:00' };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildScheduleState(weeklySchedule = {}) {
  // weeklySchedule comes from the API as a plain object: { Monday: [{startTime, endTime}], ... }
  const scheduleObj = Array.isArray(weeklySchedule)
    ? Object.fromEntries(weeklySchedule.map((s) => [s.day, [{ startTime: s.startTime, endTime: s.endTime }]]))
    : (weeklySchedule ?? {});

  return DAYS.map((day) => {
    const slots = scheduleObj[day];
    if (slots && slots.length > 0) {
      return { enabled: true, startTime: slots[0].startTime ?? '09:00', endTime: slots[0].endTime ?? '17:00' };
    }
    return { ...DEFAULT_SLOT };
  });
}

// ─── Toggle switch ────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, disabled, label, id }) {
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-2 cursor-pointer select-none"
    >
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed
          ${checked ? 'bg-primary border-primary' : 'bg-muted border-border'}`}
      >
        <span
          className={`pointer-events-none block h-3.5 w-3.5 rounded-full bg-background shadow-sm transition-transform my-auto mx-0.5
            ${checked ? 'translate-x-3.5' : 'translate-x-0'}`}
        />
      </button>
      {label && <span className="text-sm font-medium">{label}</span>}
    </label>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, description, children }) {
  return (
    <div className="rounded-2xl border-2 border-border bg-card p-5 space-y-4">
      <div>
        <h3 className="text-sm font-bold">{title}</h3>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── 1. Active toggle ─────────────────────────────────────────────────────────

function ActiveToggleSection({ isActive, onToggle, isPending }) {
  return (
    <Section
      title="Booking Status"
      description="Control whether students can request sessions with you."
    >
      {!isActive && (
        <div className="flex items-start gap-2.5 rounded-xl bg-yellow-50 border-2 border-yellow-200 dark:bg-yellow-950/40 dark:border-yellow-800 p-3">
          <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-800 dark:text-yellow-300 font-medium">
            You are not accepting new bookings. Students cannot request sessions until you re-enable this.
          </p>
        </div>
      )}
      <Toggle
        id="isActive"
        checked={isActive}
        onChange={onToggle}
        disabled={isPending}
        label={isActive ? 'Accepting bookings' : 'Not accepting bookings'}
      />
    </Section>
  );
}

// ─── 2. Weekly schedule editor ────────────────────────────────────────────────

function WeeklyScheduleSection({ schedule, onChange, onSave, isPending }) {
  return (
    <Section
      title="Weekly Schedule"
      description="Set your default availability for each day of the week."
    >
      <div className="space-y-2">
        {DAYS.map((day, i) => {
          const slot = schedule[i];
          return (
            <div
              key={day}
              className={`flex flex-wrap items-center gap-3 rounded-xl p-3 border-2 transition-colors ${
                slot.enabled ? 'border-border bg-background' : 'border-border/50 bg-muted/30'
              }`}
            >
              <div className="flex items-center gap-2 w-28 shrink-0">
                <Toggle
                  id={`day-${day}`}
                  checked={slot.enabled}
                  onChange={(v) => onChange(i, 'enabled', v)}
                />
                <span className={`text-sm font-medium ${slot.enabled ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {day.slice(0, 3)}
                </span>
              </div>

              {slot.enabled && (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor={`${day}-start`} className="text-xs text-muted-foreground whitespace-nowrap">
                      From
                    </Label>
                    <input
                      id={`${day}-start`}
                      type="time"
                      value={slot.startTime}
                      onChange={(e) => onChange(i, 'startTime', e.target.value)}
                      className="rounded-lg border-2 border-border bg-background px-2 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor={`${day}-end`} className="text-xs text-muted-foreground whitespace-nowrap">
                      To
                    </Label>
                    <input
                      id={`${day}-end`}
                      type="time"
                      value={slot.endTime}
                      onChange={(e) => onChange(i, 'endTime', e.target.value)}
                      className="rounded-lg border-2 border-border bg-background px-2 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                </div>
              )}

              {!slot.enabled && (
                <span className="text-xs text-muted-foreground">Unavailable</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-1">
        <Button size="sm" onClick={onSave} disabled={isPending} className="gap-1.5">
          <Save className="w-3.5 h-3.5" />
          {isPending ? 'Saving…' : 'Save Schedule'}
        </Button>
      </div>
    </Section>
  );
}

// ─── 3. Date overrides ────────────────────────────────────────────────────────

function DateOverridesSection({ overrides, onAdd, onRemove, isAdding, isRemoving }) {
  const [date, setDate] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');

  const handleAdd = () => {
    if (!date) return;
    // Backend uses `available` and `slots` field names
    const payload = { date, available: isAvailable };
    if (isAvailable) {
      payload.slots = [{ startTime, endTime }];
    }
    onAdd(payload, () => {
      setDate('');
      setIsAvailable(true);
      setStartTime('09:00');
      setEndTime('17:00');
    });
  };

  return (
    <Section
      title="Date Overrides"
      description="Mark specific dates as unavailable or set custom hours."
    >
      {/* Existing overrides list */}
      {overrides.length > 0 ? (
        <div className="space-y-2">
          {overrides.map((o) => (
            <div
              key={o.date}
              className="flex items-center justify-between rounded-xl border-2 border-border bg-background p-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${o.available ? 'bg-green-500' : 'bg-red-400'}`}
                />
                <div>
                  <p className="text-sm font-medium">
                    {new Date(o.date).toLocaleDateString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                      timeZone: 'UTC',
                    })}
                  </p>
                  {o.available && o.slots?.length > 0 && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {o.slots[0].startTime} – {o.slots[0].endTime}
                    </p>
                  )}
                  {!o.available && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">Unavailable</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => onRemove(o.date)}
                disabled={isRemoving}
                className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-3">No date overrides yet.</p>
      )}

      {/* Add override form */}
      <div className="rounded-xl border-2 border-dashed border-border p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add Override</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="override-date" className="text-xs">Date</Label>
            <input
              id="override-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border-2 border-border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Availability</Label>
            <div className="flex gap-3 items-center h-9">
              <Toggle
                id="override-available"
                checked={isAvailable}
                onChange={setIsAvailable}
                label={isAvailable ? 'Available' : 'Unavailable'}
              />
            </div>
          </div>
        </div>

        {isAvailable && (
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="override-start" className="text-xs text-muted-foreground">From</Label>
              <input
                id="override-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="rounded-lg border-2 border-border bg-background px-2 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Label htmlFor="override-end" className="text-xs text-muted-foreground">To</Label>
              <input
                id="override-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="rounded-lg border-2 border-border bg-background px-2 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
        )}

        <Button
          size="sm"
          variant="outline"
          onClick={handleAdd}
          disabled={!date || isAdding}
          className="gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          {isAdding ? 'Adding…' : 'Add Override'}
        </Button>
      </div>
    </Section>
  );
}

// ─── 4. Subjects & durations ──────────────────────────────────────────────────

function SubjectsDurationsSection({ subjects, durations, onSubjectsChange, onDurationsChange, onSave, isPending }) {
  const [input, setInput] = useState('');

  const addSubject = (raw) => {
    const s = raw.trim();
    if (s && !subjects.includes(s)) onSubjectsChange([...subjects, s]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSubject(input);
      setInput('');
    } else if (e.key === 'Backspace' && input === '' && subjects.length > 0) {
      onSubjectsChange(subjects.slice(0, -1));
    }
  };

  const removeSubject = (s) => onSubjectsChange(subjects.filter((x) => x !== s));

  const toggleDuration = (v) =>
    onDurationsChange(
      durations.includes(v) ? durations.filter((d) => d !== v) : [...durations, v],
    );

  return (
    <Section
      title="Subjects & Session Lengths"
      description="Tell students what you teach and how long your sessions can be."
    >
      {/* Subjects tag input */}
      <div className="space-y-1.5">
        <Label className="text-xs">Subjects</Label>
        <div className="flex flex-wrap gap-1.5 rounded-xl border-2 border-border bg-background p-2 min-h-[42px] focus-within:ring-2 focus-within:ring-ring">
          {subjects.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium px-2 py-0.5"
            >
              {s}
              <button
                type="button"
                onClick={() => removeSubject(s)}
                className="hover:text-destructive transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => { if (input.trim()) { addSubject(input); setInput(''); } }}
            placeholder={subjects.length === 0 ? 'Type a subject and press Enter…' : ''}
            className="flex-1 min-w-[140px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <p className="text-xs text-muted-foreground">Press Enter or comma to add a subject.</p>
      </div>

      {/* Duration checkboxes */}
      <div className="space-y-1.5">
        <Label className="text-xs">Session Lengths</Label>
        <div className="flex flex-wrap gap-2">
          {DURATION_OPTIONS.map(({ label, value }) => {
            const checked = durations.includes(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggleDuration(value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 text-sm font-semibold transition-colors ${
                  checked
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-background border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <Button size="sm" onClick={onSave} disabled={isPending} className="gap-1.5">
          <Save className="w-3.5 h-3.5" />
          {isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </Section>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AvailabilityManager() {
  const { toast } = useToast();
  const { data: availability, isLoading } = useAvailability();
  const { mutateAsync: updateAvail, isPending: isUpdating } = useUpdateAvailability();
  const { mutateAsync: addOverride, isPending: isAdding } = useAddDateOverride();
  const { mutateAsync: removeOverride, isPending: isRemoving } = useRemoveDateOverride();

  // ── Local state ────────────────────────────────────────────────────────────
  const [isActive, setIsActive] = useState(true);
  const [schedule, setSchedule] = useState(() => buildScheduleState([]));
  const [subjects, setSubjects] = useState([]);
  const [durations, setDurations] = useState([60]);

  // Sync from server data on load
  useEffect(() => {
    if (!availability) return;
    setIsActive(availability.isActive ?? true);
    setSchedule(buildScheduleState(availability.weeklySchedule ?? []));
    setSubjects(availability.subjects ?? []);
    setDurations(availability.sessionDurations ?? [60]);
  }, [availability]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleToggleActive = async (value) => {
    setIsActive(value);
    try {
      await updateAvail({ isActive: value });
      toast({
        title: value ? 'Now accepting bookings' : 'Bookings paused',
        description: value
          ? 'Students can now request sessions with you.'
          : 'No new session requests will come through.',
      });
    } catch (err) {
      setIsActive(!value); // revert
      toast({
        title: 'Failed to update',
        description: err?.response?.data?.message ?? 'Something went wrong.',
        variant: 'destructive',
      });
    }
  };

  const handleScheduleChange = (dayIndex, field, value) => {
    setSchedule((prev) => prev.map((s, i) => (i === dayIndex ? { ...s, [field]: value } : s)));
  };

  const handleSaveSchedule = async () => {
    // Backend expects: { Monday: [{ startTime, endTime }], ... }
    const weeklySchedule = {};
    schedule.forEach((slot, i) => {
      if (slot.enabled) {
        weeklySchedule[DAYS[i]] = [{ startTime: slot.startTime, endTime: slot.endTime }];
      }
    });
    try {
      await updateAvail({ weeklySchedule });
      toast({ title: 'Schedule saved', description: 'Your weekly availability has been updated.' });
    } catch (err) {
      toast({
        title: 'Failed to save schedule',
        description: err?.response?.data?.message ?? 'Something went wrong.',
        variant: 'destructive',
      });
    }
  };

  const handleAddOverride = async (payload, reset) => {
    try {
      await addOverride(payload);
      toast({ title: 'Override added', description: `Saved override for ${payload.date}.` });
      reset();
    } catch (err) {
      toast({
        title: 'Failed to add override',
        description: err?.response?.data?.message ?? 'Something went wrong.',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveOverride = async (date) => {
    try {
      await removeOverride(date);
      toast({ title: 'Override removed' });
    } catch (err) {
      toast({
        title: 'Failed to remove override',
        description: err?.response?.data?.message ?? 'Something went wrong.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveSubjectsDurations = async () => {
    try {
      await updateAvail({ subjects, sessionDurations: durations });
      toast({ title: 'Preferences saved', description: 'Subjects and session lengths updated.' });
    } catch (err) {
      toast({
        title: 'Failed to save',
        description: err?.response?.data?.message ?? 'Something went wrong.',
        variant: 'destructive',
      });
    }
  };

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-muted border-2 border-border" />
        ))}
      </div>
    );
  }

  const overrides = availability?.dateOverrides ?? [];

  return (
    <div className="space-y-4">
      <ActiveToggleSection
        isActive={isActive}
        onToggle={handleToggleActive}
        isPending={isUpdating}
      />
      <WeeklyScheduleSection
        schedule={schedule}
        onChange={handleScheduleChange}
        onSave={handleSaveSchedule}
        isPending={isUpdating}
      />
      <DateOverridesSection
        overrides={overrides}
        onAdd={handleAddOverride}
        onRemove={handleRemoveOverride}
        isAdding={isAdding}
        isRemoving={isRemoving}
      />
      <SubjectsDurationsSection
        subjects={subjects}
        durations={durations}
        onSubjectsChange={setSubjects}
        onDurationsChange={setDurations}
        onSave={handleSaveSubjectsDurations}
        isPending={isUpdating}
      />
    </div>
  );
}
