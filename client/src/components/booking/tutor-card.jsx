import { Star, Users, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function initials(name = '') {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/**
 * TutorCard — displays a tutor's profile in the tutor directory grid.
 *
 * Data shape from GET /bookings/tutors:
 *   tutor.name           string
 *   tutor.skills         string[]   (the User model field — used as subject tags)
 *   tutor.bio            string | undefined
 *   tutor.reputationScore number   (0 = unrated)
 *   tutor.availability   { isActive, subjects, sessionDurations, timezone } | null
 *
 * @param {Object}   props
 * @param {Object}   props.tutor   - Tutor object from the API
 * @param {Function} props.onBook  - Called with the tutor object when "Book Session" clicked
 */
export default function TutorCard({ tutor, onBook }) {
  const skills = tutor.skills ?? [];
  const score = tutor.reputationScore ?? 0;
  const isAvailable = tutor.availability?.isActive === true;
  // Session durations the tutor offers, e.g. [30, 60]
  const durations = tutor.availability?.sessionDurations ?? [];

  return (
    <Card className="flex flex-col h-full">
      <CardContent className="p-5 flex flex-col gap-4 h-full">
        {/* ── Top row: avatar + name + availability badge ── */}
        <div className="flex items-start gap-3">
          {/* Initials avatar — no profilePicture field in this endpoint */}
          <div className="w-12 h-12 rounded-full bg-primary/15 text-primary font-bold text-base flex items-center justify-center shrink-0 border-2 border-primary/20">
            {initials(tutor.name)}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight truncate">{tutor.name}</p>
            <p className="text-xs text-muted-foreground truncate">{tutor.email}</p>
          </div>

          {/* Availability pill */}
          <span
            className={cn(
              'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border shrink-0',
              isAvailable
                ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800'
                : 'bg-muted text-muted-foreground border-border',
            )}
          >
            {isAvailable ? (
              <CheckCircle className="w-3 h-3" />
            ) : (
              <XCircle className="w-3 h-3" />
            )}
            {isAvailable ? 'Available' : 'Unavailable'}
          </span>
        </div>

        {/* ── Bio ── */}
        {tutor.bio ? (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {tutor.bio}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground/50 italic">No bio provided.</p>
        )}

        {/* ── Skill tags ── */}
        <div className="flex flex-wrap gap-1.5">
          {skills.length === 0 ? (
            <span className="text-xs text-muted-foreground/60">No subjects listed</span>
          ) : (
            <>
              {skills.slice(0, 3).map((skill) => (
                <span
                  key={skill}
                  className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
                >
                  {skill}
                </span>
              ))}
              {skills.length > 3 && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent text-muted-foreground border border-border">
                  +{skills.length - 3}
                </span>
              )}
            </>
          )}
        </div>

        {/* ── Session durations ── */}
        {durations.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {durations.map((d) => (
              <span
                key={d}
                className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-accent border border-border"
              >
                {d} min
              </span>
            ))}
          </div>
        )}

        {/* ── Footer: rating + book button ── */}
        <div className="mt-auto flex items-center justify-between pt-3 border-t border-border/50">
          {/* Reputation score */}
          <div className="flex items-center gap-1.5">
            <Star
              className={cn(
                'w-3.5 h-3.5',
                score > 0 ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/40',
              )}
            />
            {score > 0 ? (
              <span className="text-sm font-semibold">{score.toFixed(1)}</span>
            ) : (
              <span className="text-xs text-muted-foreground">No rating yet</span>
            )}
          </div>

          <Button
            size="sm"
            className="h-8 text-xs"
            onClick={() => onBook(tutor)}
          >
            Book Session
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
