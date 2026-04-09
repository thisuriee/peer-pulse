import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  Crown,
  Flame,
  Medal,
  MessageSquare,
  Search,
  Trophy,
  User,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PeerPulseLogoMark } from '@/components/peer-pulse-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { useLeaderboard } from '@/hooks/use-reviews';
import { useToast } from '@/hooks/use-toast';
import apiClient from '@/lib/api-client';
import { cn } from '@/lib/utils';

const fetchMe = () => apiClient.get('/auth/me').then((r) => r.data.data ?? r.data);

const BADGE_CLASS = {
  rookie: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  bronze: 'bg-orange-50 text-orange-700 border-orange-200',
  silver: 'bg-slate-50 text-slate-700 border-slate-200',
  gold: 'bg-yellow-50 text-yellow-700 border-yellow-200',
};

function Navbar({ user, onLogout }) {
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
          <PeerPulseLogoMark size={36} className="shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          <span className="text-base font-display font-extrabold tracking-tight uppercase">PeerPulse</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {[
            { label: 'Home', href: '/home' },
            { label: 'Sessions', href: '/sessions' },
            { label: 'Resources', href: '/resources' },
            { label: 'Reviews', href: '/reviews' },
            { label: 'Community', href: '/threads' },
            { label: 'Tutors', href: '/tutors' },
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
          <div className="w-8 h-8 rounded-full bg-primary/15 text-primary font-semibold text-xs flex items-center justify-center">
            {initials}
          </div>
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onLogout}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}

function RankBadge({ rank }) {
  if (rank === 1) return <Crown className="w-4 h-4 text-yellow-500" />;
  if (rank === 2) return <Medal className="w-4 h-4 text-slate-400" />;
  if (rank === 3) return <Medal className="w-4 h-4 text-orange-400" />;
  return <span className="text-xs font-semibold text-muted-foreground">#{rank}</span>;
}

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tab, setTab] = useState('topTutors');
  const [search, setSearch] = useState('');

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    retry: false,
  });
  const { data: leaderboard, isLoading } = useLeaderboard(true);

  const list = useMemo(() => {
    const rows = leaderboard?.[tab] ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((x) => [x.name, x.email].filter(Boolean).some((v) => v.toLowerCase().includes(q)));
  }, [leaderboard, tab, search]);

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (_) {}
    toast({ title: 'Signed out', description: 'See you next time!' });
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} onLogout={handleLogout} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <section className="rounded-2xl border-2 border-border bg-card p-5 pp-brutal-shadow">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Community</p>
              <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight mt-1">
                Leaderboard
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Top tutors, rising tutors, and most helpful students.
              </p>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or email..."
                className="pl-9"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border-2 border-border bg-card p-4 md:p-5">
          <div className="flex flex-wrap gap-2 mb-5">
            <Button
              size="sm"
              variant={tab === 'topTutors' ? 'default' : 'outline'}
              className="gap-1.5"
              onClick={() => setTab('topTutors')}
            >
              <Trophy className="w-4 h-4" /> Top Tutors
            </Button>
            <Button
              size="sm"
              variant={tab === 'risingTutors' ? 'default' : 'outline'}
              className="gap-1.5"
              onClick={() => setTab('risingTutors')}
            >
              <Flame className="w-4 h-4" /> Rising Tutors
            </Button>
            <Button
              size="sm"
              variant={tab === 'mostHelpfulStudents' ? 'default' : 'outline'}
              className="gap-1.5"
              onClick={() => setTab('mostHelpfulStudents')}
            >
              <Users className="w-4 h-4" /> Helpful Students
            </Button>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground py-6">Loading leaderboard...</p>
          ) : list.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">No data found.</p>
          ) : (
            <div className="space-y-3">
              {list.map((row, idx) => (
                <article
                  key={(row._id ?? row.userId ?? row.email ?? idx).toString()}
                  className="rounded-2xl border-2 border-border p-4 bg-background hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <RankBadge rank={idx + 1} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{row.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{row.email}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      {tab !== 'mostHelpfulStudents' && (
                        <>
                          <span className="text-sm font-semibold">{Number(row.reputationScore || 0).toFixed(1)}</span>
                          <span className="text-xs text-muted-foreground">({row.reviewCount || 0})</span>
                          {row.badge && row.badge !== 'none' && (
                            <span
                              className={cn(
                                'text-xs px-2 py-0.5 rounded-full border capitalize',
                                BADGE_CLASS[row.badge] || 'bg-muted text-muted-foreground border-border'
                              )}
                            >
                              {row.badge}
                            </span>
                          )}
                        </>
                      )}
                      {tab === 'topTutors' && (
                        <span className="text-xs px-2 py-0.5 rounded-full border border-border bg-muted">
                          score {row.weightedScore}
                        </span>
                      )}
                      {tab === 'risingTutors' && (
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded-full border',
                          row.growth >= 0 ? 'text-green-700 bg-green-50 border-green-200' : 'text-destructive bg-destructive/10 border-destructive/20'
                        )}>
                          {row.growth >= 0 ? '+' : ''}{row.growth} (30d)
                        </span>
                      )}
                      {tab === 'mostHelpfulStudents' && (
                        <div className="text-right">
                          <p className="text-sm font-semibold">{row.helpfulScore}</p>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1 justify-end">
                            <MessageSquare className="w-3 h-3" />
                            replies {row.replies} | upvotes {row.upvotesReceived} | reviews {row.reviewsSubmitted}
                          </p>
                        </div>
                      )}
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

