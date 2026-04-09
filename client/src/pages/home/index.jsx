import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  Users,
  Star,
  Calendar,
  MessageSquare,
  FileText,
  Clock,
  ChevronRight,
  Bell,
  LogOut,
  Settings,
  TrendingUp,
  Award,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PeerPulseLogoMark } from "@/components/peer-pulse-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from '@/hooks/use-toast';
import apiClient from '@/lib/api-client';

function Starburst({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 120"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M60 0L68 42L110 34L78 60L110 86L68 78L60 120L52 78L10 86L42 60L10 34L52 42Z" />
    </svg>
  );
}

// ─── Data fetching ────────────────────────────────────────────────────────────

const fetchMe = () => apiClient.get('/auth/me').then((r) => r.data.data ?? r.data);
const fetchSessions = () => apiClient.get('/sessions').then((r) => r.data.data ?? r.data);
const fetchThreads = () => apiClient.get('/threads?limit=4').then((r) => r.data.data ?? r.data);
const fetchResources = () => apiClient.get('/resources?limit=4').then((r) => r.data.data ?? r.data);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BADGE_STYLES = {
  gold: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  silver: 'text-slate-500 bg-slate-50 border-slate-200',
  bronze: 'text-orange-600 bg-orange-50 border-orange-200',
  none: 'text-muted-foreground bg-muted border-border',
};

const SESSION_STATUS_META = {
  PENDING: { label: 'Pending', icon: AlertCircle, cls: 'text-yellow-600' },
  ACCEPTED: { label: 'Accepted', icon: CheckCircle2, cls: 'text-green-600' },
  CONFIRMED: { label: 'Confirmed', icon: CheckCircle2, cls: 'text-primary' },
  COMPLETED: { label: 'Completed', icon: CheckCircle2, cls: 'text-muted-foreground' },
  DECLINED: { label: 'Declined', icon: XCircle, cls: 'text-destructive' },
  CANCELLED: { label: 'Cancelled', icon: XCircle, cls: 'text-destructive' },
};

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtRelative(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function initials(name = '') {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ name, size = 'md' }) {
  const sz =
    size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-11 h-11 text-base' : 'w-9 h-9 text-sm';
  return (
    <div
      className={`${sz} rounded-full bg-primary/15 text-primary font-semibold flex items-center justify-center shrink-0`}
    >
      {initials(name)}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
              {label}
            </p>
            <p className={`text-2xl font-bold ${accent ?? 'text-foreground'}`}>{value ?? '—'}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SessionRow({ session, role }) {
  const peer = role === 'student' ? session.tutor : session.student;
  const meta = SESSION_STATUS_META[session.status] ?? SESSION_STATUS_META.PENDING;
  const StatusIcon = meta.icon;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0">
      <Avatar name={peer?.name ?? 'User'} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{peer?.name ?? 'Unknown'}</p>
        <p className="text-xs text-muted-foreground truncate">{session.subject}</p>
      </div>
      <div className="text-right shrink-0">
        <div className={`flex items-center gap-1 text-xs font-medium ${meta.cls}`}>
          <StatusIcon className="w-3 h-3" />
          {meta.label}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(session.scheduledAt)}</p>
      </div>
    </div>
  );
}

function ThreadRow({ thread }) {
  return (
    <div className="py-3 border-b border-border/50 last:border-0">
      <div className="flex items-start gap-2">
        <Avatar name={thread.authorId?.name ?? 'User'} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug line-clamp-1">{thread.title}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-muted-foreground">{thread.subject}</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MessageSquare className="w-3 h-3" />
              {thread.replyCount ?? thread.replies?.length ?? 0}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="w-3 h-3" />
              {thread.upvoteCount ?? thread.upvotes?.length ?? 0}
            </span>
            <span className="text-xs text-muted-foreground ml-auto">
              {fmtRelative(thread.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResourceRow({ resource }) {
  const typeColors = {
    PDF: 'bg-red-50 text-red-600 border-red-200',
    Video: 'bg-blue-50 text-blue-600 border-blue-200',
    default: 'bg-accent text-muted-foreground border-border',
  };
  const cls = typeColors[resource.type] ?? typeColors.default;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0">
      <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${cls}`}>
        <FileText className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{resource.title}</p>
        <p className="text-xs text-muted-foreground truncate">
          {resource.tutor_id?.name ?? 'Tutor'}
        </p>
      </div>
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cls}`}>
        {resource.type}
      </span>
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar({ user, onLogout }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b-2 border-border bg-background/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo — layered mark */}
        <Link to="/home" className="flex items-center gap-2.5 shrink-0 group">
          <PeerPulseLogoMark
            size={36}
            className="shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 drop-shadow-[3px_4px_0_rgba(0,0,0,0.12)] dark:drop-shadow-[4px_5px_0_rgba(0,0,0,0.45)]"
          />
          <span className="text-base font-display font-extrabold tracking-tight uppercase">
            PeerPulse
          </span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1">
          {[
            { label: 'Home', href: '/home', active: true },
            { label: 'Sessions', href: '/sessions' },
            { label: 'Resources', href: '/resources' },
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

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button className="w-9 h-9 flex items-center justify-center rounded-full border-2 border-transparent text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <Bell className="w-4 h-4" />
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-2 rounded-full px-2 py-1 border-2 border-transparent hover:border-border hover:bg-accent transition-colors"
            >
              <Avatar name={user?.name ?? 'User'} size="sm" />
              <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate">
                {user?.name ?? 'Loading…'}
              </span>
            </button>

            {open && (
              <div className="absolute right-0 top-full mt-1 w-52 rounded-2xl border-2 border-border bg-background shadow-lg py-1 z-50 pp-brutal-shadow">
                <div className="px-3 py-2 border-b border-border mb-1">
                  <p className="text-sm font-semibold truncate">{user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20 capitalize">
                    {user?.role}
                  </span>
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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    retry: false,
  });

  const { data: sessionsRaw = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: fetchSessions,
    enabled: !!user,
  });

  const { data: threadsRaw = [] } = useQuery({
    queryKey: ['threads'],
    queryFn: fetchThreads,
    enabled: !!user,
  });

  const { data: resourcesRaw = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: fetchResources,
    enabled: !!user,
  });

  // Normalise array vs paginated envelope
  const sessions = Array.isArray(sessionsRaw) ? sessionsRaw : (sessionsRaw.sessions ?? []);
  const threads = Array.isArray(threadsRaw) ? threadsRaw : (threadsRaw.threads ?? []);
  const resources = Array.isArray(resourcesRaw) ? resourcesRaw : (resourcesRaw.resources ?? []);

  const role = user?.role ?? 'student';
  const isTutor = role === 'tutor';

  // Derived stats
  const upcomingSessions = sessions.filter((s) =>
    ['PENDING', 'ACCEPTED', 'CONFIRMED'].includes(s.status),
  );
  const pendingRequests = sessions.filter((s) => s.status === 'PENDING');
  const completedSessions = sessions.filter((s) => s.status === 'COMPLETED');
  const badge = user?.badge ?? 'none';
  const reputationScore = user?.reputationScore ?? 0;

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (_) {
      // swallow
    }
    toast({ title: 'Signed out', description: 'See you next time!' });
    navigate('/login');
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-5">
          <PeerPulseLogoMark
            size={56}
            className="animate-pulse drop-shadow-[4px_5px_0_rgba(0,0,0,0.12)] dark:drop-shadow-[5px_6px_0_rgba(0,0,0,0.4)]"
          />
          <p className="text-sm font-medium text-muted-foreground font-display uppercase tracking-wide">
            Loading your dashboard…
          </p>
        </div>
      </div>
    );
  }

  const heroPill = user?.name?.split(' ')[0] ?? 'Peer';
  const pillarStrip = isTutor
    ? [
        {
          title: 'Requests',
          stat: `${pendingRequests.length} pending`,
          body: 'Stay on top of student bookings and confirmations.',
          panelClass:
            'bg-brand-purple text-brand-mint border-black/15 dark:border-white/20 [&_.pp-mini]:text-brand-mint/80',
        },
        {
          title: 'Sessions',
          stat: `${upcomingSessions.length} upcoming`,
          body: 'Your calendar and history stay synced in one view.',
          panelClass:
            'bg-brand-mint text-brand-ink border-black/20 dark:bg-[hsl(165_25%_12%)] dark:text-brand-mint dark:border-white/15 [&_.pp-mini]:text-brand-ink/65 dark:[&_.pp-mini]:text-brand-mint/75',
        },
        {
          title: 'Reputation',
          stat: `${reputationScore > 0 ? reputationScore.toFixed(1) : '—'} score`,
          body: 'Great reviews grow your badge and visibility.',
          panelClass:
            'bg-brand-green text-brand-ink border-black/20 dark:text-brand-ink [&_.pp-mini]:text-brand-ink/75',
        },
      ]
    : [
        {
          title: 'Sessions',
          stat: `${upcomingSessions.length} upcoming`,
          body: 'Book, reschedule, and join from your dashboard.',
          panelClass:
            'bg-brand-purple text-brand-mint border-black/15 dark:border-white/20 [&_.pp-mini]:text-brand-mint/80',
        },
        {
          title: 'Resources',
          stat: `${resources.length} pinned`,
          body: 'PDFs and videos from tutors — ready when you are.',
          panelClass:
            'bg-brand-mint text-brand-ink border-black/20 dark:bg-black dark:text-brand-mint dark:border-white/15 [&_.pp-mini]:text-brand-ink/65 dark:[&_.pp-mini]:text-brand-mint/75',
        },
        {
          title: 'Community',
          stat: `${threads.length} recent`,
          body: 'Threads and upvotes keep the study hub moving.',
          panelClass:
            'bg-brand-green text-brand-ink border-black/20 dark:text-brand-ink [&_.pp-mini]:text-brand-ink/75',
        },
      ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar user={user} onLogout={handleLogout} />

      {/* First screen: hero + three tiles fill viewport below navbar (dashboard scrolls in next) */}
      <div className="flex flex-col min-h-[calc(100dvh-3.5rem)] shrink-0">
        {/* Hero — flex-1 so it expands; content vertically centered */}
        <section className="relative flex-1 flex flex-col min-h-[min(100%,320px)] bg-[hsl(var(--pp-hero-bg))] text-[hsl(var(--pp-hero-fg))] overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage: `radial-gradient(circle at 90% 15%, var(--brand-mint) 0%, transparent 42%)`,
            }}
          />
          <div className="flex-1 flex items-center max-w-7xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-16 md:py-20 lg:py-24 relative z-[1]">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center w-full">
              <div>
                <p className="text-xs font-display font-bold uppercase tracking-[0.2em] text-[hsl(var(--pp-hero-fg))]/75 mb-4">
                  Welcome back
                </p>
                <h1 className="font-display font-extrabold text-[clamp(1.75rem,4.2vw,3.15rem)] leading-[1.06] uppercase tracking-tight">
                  <span className="inline-block rounded-full bg-brand-purple/90 backdrop-blur-sm px-4 py-1.5 text-brand-mint border-2 border-[hsl(var(--pp-hero-fg))]/35 shadow-sm">
                    {heroPill}
                  </span>
                  <span className="block mt-3">
                    {isTutor ? 'Your tutoring command center' : 'Your learning command center'}
                  </span>
                </h1>
                <p className="mt-5 text-sm sm:text-base md:text-lg text-[hsl(var(--pp-hero-fg))]/90 max-w-xl leading-relaxed">
                  {isTutor
                    ? 'Pending requests, live sessions, and shared files — all in one loud, friendly workspace.'
                    : 'Track sessions, jump into discussions, and grab resources without losing the plot.'}
                </p>
                <div className="flex flex-wrap gap-3 mt-10">
                  {isTutor ? (
                    <Button
                      size="sm"
                      className="gap-2 h-10 bg-brand-ink text-brand-mint border-brand-ink hover:bg-brand-ink/90"
                    >
                      <Plus className="w-4 h-4" />
                      New Resource
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="gap-2 h-10 bg-brand-ink text-brand-mint border-brand-ink hover:bg-brand-ink/90"
                      onClick={() => navigate('/tutors')}
                    >
                      <Search className="w-4 h-4" />
                      Find a Tutor
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 h-10 border-2 border-[hsl(var(--pp-hero-fg))]/45 bg-transparent text-[hsl(var(--pp-hero-fg))] hover:bg-[hsl(var(--pp-hero-fg))]/10"
                  >
                    <Calendar className="w-4 h-4" />
                    {isTutor ? 'My Schedule' : 'Book Session'}
                  </Button>
                </div>
              </div>
              <div className="relative hidden sm:flex justify-center lg:justify-end items-center min-h-[200px]">
                <div className="relative">
                  <PeerPulseLogoMark
                    className="w-[clamp(7.5rem,22vw,12.5rem)] aspect-square max-w-[200px] drop-shadow-[8px_10px_0_rgba(0,0,0,0.18)] dark:drop-shadow-[10px_12px_0_rgba(0,0,0,0.35)]"
                  />
                  <Starburst className="absolute -bottom-4 -right-2 sm:-right-4 w-24 h-24 sm:w-28 sm:h-28 text-brand-green opacity-95 pointer-events-none drop-shadow-lg" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Breathing room before tiles, then strip anchored to bottom of first screen */}
        <section className="shrink-0 mt-10 sm:mt-12 md:mt-16 lg:mt-20 px-4 sm:px-6 pb-10 md:pb-12 border-b-2 border-foreground/15">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-0 sm:rounded-2xl sm:border-2 sm:border-foreground/15 sm:overflow-hidden">
              {pillarStrip.map(({ title, stat, body, panelClass }) => (
                <div
                  key={title}
                  className={`p-6 sm:p-7 rounded-2xl border-2 sm:rounded-none sm:border-0 sm:border-r-2 border-foreground/15 last:border-r-0 sm:last:border-r-0 flex flex-col justify-between gap-4 min-h-[188px] sm:min-h-[220px] ${panelClass}`}
                >
                  <div>
                    <p className="font-display font-extrabold text-sm uppercase tracking-wide">
                      {title}
                    </p>
                    <p className="pp-mini text-xs font-semibold mt-2">{stat}</p>
                    <p className="text-xs mt-3 leading-relaxed opacity-95">{body}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full border-2 border-current bg-transparent hover:bg-black/5 dark:hover:bg-white/10"
                    asChild
                  >
                    <Link
                      to={
                        title === 'Community'
                          ? '/threads'
                          : title === 'Resources'
                            ? '/resources'
                            : '/sessions'
                      }
                    >
                      Open
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-12 space-y-8 relative w-full">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_45%_at_50%_0%,hsl(var(--primary)/0.07),transparent)]" />

        {/* ── Stats row ─────────────────────────────────────────────── */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={Calendar}
            label="Upcoming Sessions"
            value={upcomingSessions.length}
            sub={`${completedSessions.length} completed`}
          />
          {isTutor ? (
            <div
              className="cursor-pointer"
              onClick={() => navigate('/sessions?status=pending')}
            >
              <StatCard
                icon={AlertCircle}
                label="Pending Requests"
                value={pendingRequests.length}
                sub="awaiting your response"
                accent={pendingRequests.length > 0 ? 'text-yellow-600' : undefined}
              />
            </div>
          ) : (
            <StatCard
              icon={BookOpen}
              label="Resources"
              value={resources.length}
              sub="available to you"
            />
          )}
          <StatCard
            icon={TrendingUp}
            label="Reputation"
            value={reputationScore > 0 ? reputationScore.toFixed(1) : '—'}
            sub={`${user?.reviewCount ?? 0} reviews`}
          />
          <StatCard
            icon={Award}
            label="Badge"
            value={
              <span className="capitalize flex items-center gap-1.5">
                {badge !== 'none' ? (
                  <>
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-full ${
                        badge === 'gold'
                          ? 'bg-yellow-400'
                          : badge === 'silver'
                            ? 'bg-slate-400'
                            : 'bg-orange-400'
                      }`}
                    />
                    {badge}
                  </>
                ) : (
                  'None yet'
                )}
              </span>
            }
            sub="earn via great reviews"
          />
        </section>

        {/* ── Main grid ─────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upcoming sessions */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {isTutor ? 'Upcoming & Pending Sessions' : 'My Sessions'}
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      {isTutor
                        ? 'Manage bookings from students'
                        : 'Your scheduled tutoring sessions'}
                    </CardDescription>
                  </div>
                  <Link to="/sessions">
                    <Button variant="ghost" size="sm" className="gap-1 text-xs h-7">
                      View all <ChevronRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="px-6 pb-4">
                {sessions.slice(0, 5).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium">No sessions yet</p>
                    <p className="text-xs mt-1">
                      {isTutor
                        ? 'Set your availability to start receiving bookings'
                        : 'Find a tutor and book your first session'}
                    </p>
                    <Button size="sm" variant="outline" className="mt-3 h-8 text-xs gap-1.5">
                      {isTutor ? (
                        <>
                          <Clock className="w-3.5 h-3.5" /> Set Availability
                        </>
                      ) : (
                        <>
                          <Search className="w-3.5 h-3.5" /> Browse Tutors
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  sessions
                    .slice(0, 5)
                    .map((s) => <SessionRow key={s._id} session={s} role={role} />)
                )}
              </CardContent>
            </Card>

            {/* Community threads */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Community Discussions</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Recent activity in the study hub
                    </CardDescription>
                  </div>
                  <Link to="/threads">
                    <Button variant="ghost" size="sm" className="gap-1 text-xs h-7">
                      View all <ChevronRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="px-6 pb-4">
                {threads.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium">No discussions yet</p>
                    <p className="text-xs mt-1">Start a thread to get help from peers</p>
                    <Button size="sm" variant="outline" className="mt-3 h-8 text-xs gap-1.5">
                      <Plus className="w-3.5 h-3.5" /> Start Discussion
                    </Button>
                  </div>
                ) : (
                  threads.map((t) => <ThreadRow key={t._id} thread={t} />)
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column (1/3 width) */}
          <div className="space-y-6">
            {/* Profile summary card */}
            <Card className="relative overflow-hidden">
              {/* Decorative gradient */}
              <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent" />
              <CardContent className="p-5 relative">
                <div className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-full bg-primary/15 text-primary font-bold text-xl flex items-center justify-center mt-2 mb-3 border-2 border-primary/20">
                    {initials(user?.name ?? 'U')}
                  </div>
                  <p className="font-semibold text-sm">{user?.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 capitalize">{user?.role}</p>

                  {/* Badge */}
                  {badge !== 'none' && (
                    <span
                      className={`mt-2 text-xs font-medium px-2.5 py-0.5 rounded-full border capitalize ${
                        BADGE_STYLES[badge] ?? BADGE_STYLES.none
                      }`}
                    >
                      {badge} Badge
                    </span>
                  )}

                  {/* Reputation stars */}
                  {reputationScore > 0 && (
                    <div className="flex items-center gap-1 mt-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i <= Math.round(reputationScore)
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-muted-foreground/30'
                          }`}
                        />
                      ))}
                      <span className="text-xs text-muted-foreground ml-1">
                        {reputationScore.toFixed(1)}
                      </span>
                    </div>
                  )}

                  {/* Skills */}
                  {user?.skills?.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1 mt-3">
                      {user.skills.slice(0, 4).map((skill) => (
                        <span
                          key={skill}
                          className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full"
                        >
                          {skill}
                        </span>
                      ))}
                      {user.skills.length > 4 && (
                        <span className="text-xs bg-accent text-muted-foreground px-2 py-0.5 rounded-full">
                          +{user.skills.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  <Button variant="outline" size="sm" className="mt-4 w-full h-8 text-xs gap-1.5">
                    <Settings className="w-3.5 h-3.5" />
                    Edit Profile
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Resources */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Study Resources</CardTitle>
                  <Link to="/resources">
                    <Button variant="ghost" size="sm" className="gap-1 text-xs h-7">
                      All <ChevronRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="px-6 pb-4">
                {resources.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <FileText className="w-7 h-7 mx-auto mb-2 opacity-40" />
                    <p className="text-xs">No resources available yet</p>
                    {isTutor && (
                      <Button size="sm" variant="outline" className="mt-3 h-8 text-xs gap-1.5">
                        <Plus className="w-3.5 h-3.5" /> Upload Resource
                      </Button>
                    )}
                  </div>
                ) : (
                  resources.slice(0, 4).map((r) => <ResourceRow key={r._id} resource={r} />)
                )}
              </CardContent>
            </Card>

            {/* Quick actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-5 space-y-2">
                {isTutor ? (
                  <>
                    <QuickAction
                      icon={Clock}
                      label="Set Availability"
                      href="/sessions/availability"
                    />
                    <QuickAction icon={FileText} label="Upload Resource" href="/resources/new" />
                    <QuickAction icon={Users} label="View Students" href="/sessions" />
                    <QuickAction icon={MessageSquare} label="Community Hub" href="/threads" />
                  </>
                ) : (
                  <>
                    <QuickAction icon={Search} label="Find Tutors" href="/tutors" />
                    <QuickAction icon={Calendar} label="Book Session" href="/sessions/new" />
                    <QuickAction icon={BookOpen} label="Browse Resources" href="/resources" />
                    <QuickAction icon={MessageSquare} label="Ask Community" href="/threads/new" />
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ── Platform stats banner ─────────────────────────────────── */}
        <section>
          <Card className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
            <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-sm">
                    {isTutor ? 'Grow your impact as a tutor' : 'Ready to level up your learning?'}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    {isTutor
                      ? 'Set your availability, accept sessions, and share resources to build your reputation.'
                      : 'Book a session with a top-rated tutor, explore resources, or ask the community.'}
                  </p>
                </div>
                <Button size="sm" className="gap-2 h-9 shrink-0">
                  {isTutor ? 'Manage Availability' : 'Browse Tutors'}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Mini stats */}
              <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-primary/15">
                {[
                  { label: 'Active Tutors', value: '120+' },
                  { label: 'Sessions Held', value: '2.4k' },
                  { label: 'Resources Shared', value: '580+' },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <p className="text-lg font-bold text-primary">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}

function QuickAction({ icon: Icon, label, href }) {
  return (
    <Link
      to={href}
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-accent transition-colors group"
    >
      <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
        <Icon className="w-3.5 h-3.5 text-primary" />
      </div>
      <span className="text-sm font-medium flex-1">{label}</span>
      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}
