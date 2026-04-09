import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpRight,
  Bell,
  ChevronDown,
  Crown,
  LogOut,
  Search,
  Settings,
  Star,
  TrendingDown,
  TrendingUp,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PeerPulseLogoMark } from '@/components/peer-pulse-logo';
import BadgeProgress from '@/components/review/badge-progress';
import { ThemeToggle } from '@/components/theme-toggle';
import { useBookings } from '@/hooks/use-bookings';
import { useMyReviews } from '@/hooks/use-reviews';
import { useToast } from '@/hooks/use-toast';
import apiClient from '@/lib/api-client';
import { cn } from '@/lib/utils';

const fetchMe = () => apiClient.get('/auth/me').then((r) => r.data.data ?? r.data);

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function Navbar({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const initials =
    user?.name
      ?.split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() ?? 'U';

  return (
    <header className="sticky top-0 z-40 w-full border-b-2 border-border bg-background/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <Link to="/home" className="flex items-center gap-2.5 shrink-0 group">
          <PeerPulseLogoMark
            size={36}
            className="shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
          <span className="text-base font-display font-extrabold tracking-tight uppercase">
            PeerPulse
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {[
            { label: 'Home', href: '/home' },
            { label: 'Sessions', href: '/sessions' },
            { label: 'Reviews', href: '/reviews', active: true },
          ].map(({ label, href, active }) => (
            <Link
              key={label}
              to={href}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                active
                  ? 'text-primary bg-primary/10 border-2 border-primary/25'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent border-2 border-transparent'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button className="w-9 h-9 flex items-center justify-center rounded-full border-2 border-transparent text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <Bell className="w-4 h-4" />
          </button>

          <div className="relative">
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-2 rounded-full px-2 py-1 border-2 border-transparent hover:border-border hover:bg-accent transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-primary/15 text-primary font-semibold text-xs flex items-center justify-center">
                {initials}
              </div>
              <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate">
                {user?.name ?? 'Loading…'}
              </span>
            </button>
            {open && (
              <div className="absolute right-0 top-full mt-1 w-52 rounded-2xl border-2 border-border bg-background shadow-lg py-1 z-50 pp-brutal-shadow">
                <div className="px-3 py-2 border-b border-border mb-1">
                  <p className="text-sm font-semibold truncate">{user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default function ReviewsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    retry: false,
  });
  const isTutor = user?.role === 'tutor';

  const { data: reviews = [], isLoading: reviewsLoading } = useMyReviews(!!isTutor);
  const { data: bookingsData } = useBookings({ page: 1, limit: 500 });
  const bookings = bookingsData?.bookings ?? [];

  const bookingById = useMemo(
    () =>
      bookings.reduce((acc, b) => {
        acc[(b._id ?? b.id).toString()] = b;
        return acc;
      }, {}),
    [bookings]
  );

  const statusOptions = useMemo(() => {
    const unique = new Set();
    reviews.forEach((r) => {
      const bookingId = (typeof r.booking === 'string' ? r.booking : r.booking?._id)?.toString();
      const b = bookingById[bookingId];
      if (b?.status) unique.add(b.status.toLowerCase());
    });
    return ['all', ...Array.from(unique)];
  }, [reviews, bookingById]);

  const enriched = useMemo(() => {
    return reviews.map((r) => {
      const bookingId = (typeof r.booking === 'string' ? r.booking : r.booking?._id)?.toString();
      const booking = bookingById[bookingId];
      const student = booking?.student;
      return {
        ...r,
        booking,
        studentName: student?.name ?? 'Student',
        studentEmail: student?.email ?? '',
        subject: booking?.subject ?? 'Session',
        bookingStatus: booking?.status?.toLowerCase() ?? 'unknown',
      };
    });
  }, [reviews, bookingById]);

  const filteredReviews = useMemo(() => {
    let result = [...enriched];

    if (ratingFilter !== 'all') {
      result = result.filter((r) => Number(r.rating) === Number(ratingFilter));
    }
    if (statusFilter !== 'all') {
      result = result.filter((r) => r.bookingStatus === statusFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((r) =>
        [r.studentName, r.studentEmail, r.subject, r.comment]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(q))
      );
    }

    if (sortBy === 'highest') {
      result.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'lowest') {
      result.sort((a, b) => a.rating - b.rating);
    } else {
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return result;
  }, [enriched, ratingFilter, statusFilter, search, sortBy]);

  const analytics = useMemo(() => {
    const total = enriched.length;
    const avg = total ? Math.round((enriched.reduce((s, r) => s + (r.rating || 0), 0) / total) * 10) / 10 : 0;
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    enriched.forEach((r) => {
      const key = Number(r.rating);
      if (dist[key] !== undefined) dist[key] += 1;
    });
    const recent = [...enriched].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const latestFive = recent.slice(0, 5);
    const previousFive = recent.slice(5, 10);
    const latestAvg = latestFive.length
      ? latestFive.reduce((s, r) => s + r.rating, 0) / latestFive.length
      : 0;
    const prevAvg = previousFive.length
      ? previousFive.reduce((s, r) => s + r.rating, 0) / previousFive.length
      : latestAvg;
    const trend = Math.round((latestAvg - prevAvg) * 10) / 10;
    return { total, avg, dist, trend };
  }, [enriched]);

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (_) {
      // ignore
    }
    toast({ title: 'Signed out', description: 'See you next time!' });
    navigate('/login');
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <PeerPulseLogoMark size={56} className="animate-pulse" />
      </div>
    );
  }

  if (!isTutor) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} onLogout={handleLogout} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border-2 border-border bg-card p-4 pp-brutal-shadow">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Reputation</p>
              <p className="text-3xl font-display font-extrabold mt-1">{analytics.avg || '—'}</p>
              <p className="text-xs text-muted-foreground mt-1">From {analytics.total} reviews</p>
            </div>
            <div className="rounded-2xl border-2 border-border bg-card p-4 pp-brutal-shadow">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Trend</p>
              <div className="mt-1 flex items-center gap-2">
                {analytics.trend >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-green-600" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-destructive" />
                )}
                <p className="text-3xl font-display font-extrabold">
                  {analytics.trend >= 0 ? '+' : ''}
                  {analytics.trend}
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Last 5 vs previous 5 reviews</p>
            </div>
            <div className="rounded-2xl border-2 border-border bg-card p-4 pp-brutal-shadow">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">5-Star Rate</p>
              <p className="text-3xl font-display font-extrabold mt-1">
                {analytics.total
                  ? Math.round(((analytics.dist[5] || 0) / analytics.total) * 100)
                  : 0}
                %
              </p>
              <p className="text-xs text-muted-foreground mt-1">{analytics.dist[5]} five-star reviews</p>
            </div>
          </div>
          <BadgeProgress badge={user?.badge} reviewCount={user?.reviewCount ?? 0} />
        </section>

        <section className="rounded-2xl border-2 border-border bg-card p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold flex items-center gap-2">
                <Crown className="w-4 h-4 text-primary" />
                Community Leaderboard
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Compare top tutors, rising tutors, and most helpful students.
              </p>
            </div>
            <Button asChild size="sm" className="gap-1.5">
              <Link to="/leaderboard">
                Open Leaderboard <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="rounded-2xl border-2 border-border bg-card p-4 md:p-5 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by student, subject, email, comment..."
                className="pl-9"
              />
            </div>
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="h-10 rounded-full border-2 border-input bg-background px-4 text-sm"
            >
              <option value="all">All ratings</option>
              <option value="5">5 stars</option>
              <option value="4">4 stars</option>
              <option value="3">3 stars</option>
              <option value="2">2 stars</option>
              <option value="1">1 star</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-full border-2 border-input bg-background px-4 text-sm capitalize"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="h-10 rounded-full border-2 border-input bg-background px-4 text-sm flex items-center gap-2"
              onClick={() =>
                setSortBy((s) => (s === 'recent' ? 'highest' : s === 'highest' ? 'lowest' : 'recent'))
              }
            >
              Sort: {sortBy} <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {reviewsLoading ? (
            <p className="text-sm text-muted-foreground py-8">Loading reviews...</p>
          ) : filteredReviews.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8">No reviews found for these filters.</p>
          ) : (
            <div className="space-y-3">
              {filteredReviews.map((review) => (
                <article
                  key={review._id ?? review.id}
                  className="rounded-2xl border-2 border-border p-4 bg-background hover:border-primary/30 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-start gap-3 md:gap-4">
                    <div className="flex items-center gap-2 min-w-[220px]">
                      <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{review.studentName}</p>
                        <p className="text-xs text-muted-foreground truncate">{review.studentEmail || '—'}</p>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{review.subject}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full border border-border bg-muted capitalize">
                          {review.bookingStatus}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto">{fmtDate(review.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-2">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={cn(
                              'w-4 h-4',
                              s <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/40'
                            )}
                          />
                        ))}
                        <span className="text-xs font-medium ml-1">{review.rating}/5</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                        {review.comment?.trim() || 'No written comment from the student.'}
                      </p>
                    </div>

                    <div className="shrink-0">
                      <Button variant="outline" size="sm" className="gap-1.5" asChild>
                        <Link to="/sessions">
                          Session <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

