import { Award, ChevronRight } from 'lucide-react';

const BADGE_THRESHOLDS = [
  { name: 'rookie', minReviews: 1 },
  { name: 'bronze', minReviews: 10 },
  { name: 'silver', minReviews: 20 },
  { name: 'gold', minReviews: 40 },
];

function titleCase(value = '') {
  if (!value || value === 'none') return 'None';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function BadgeProgress({ badge = 'none', reviewCount = 0 }) {
  const nextBadge = BADGE_THRESHOLDS.find((b) => reviewCount < b.minReviews);
  const remaining = nextBadge ? Math.max(nextBadge.minReviews - reviewCount, 0) : 0;

  return (
    <div className="rounded-2xl border-2 border-border bg-card p-4 pp-brutal-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Badge</p>
          <p className="text-2xl font-display font-extrabold mt-1">{titleCase(badge)}</p>
        </div>
        <div className="w-11 h-11 rounded-full bg-primary/15 text-primary flex items-center justify-center">
          <Award className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-4">
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{
              width: `${Math.min((reviewCount / 40) * 100, 100)}%`,
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {nextBadge
            ? `${remaining} more review${remaining === 1 ? '' : 's'} to ${titleCase(nextBadge.name)}`
            : 'Top tier unlocked'}
        </p>
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        {BADGE_THRESHOLDS.map((item) => (
          <span
            key={item.name}
            className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] text-muted-foreground"
          >
            {titleCase(item.name)}
          </span>
        ))}
        <span className="ml-auto text-[10px] text-muted-foreground flex items-center gap-1">
          {reviewCount} reviews <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
}

