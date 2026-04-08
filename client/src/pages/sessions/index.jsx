import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LogOut, Settings, Bell, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PeerPulseLogoMark } from '@/components/peer-pulse-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import SessionCard from '@/components/booking/session-card';
import { useBookings } from '@/hooks/use-bookings';
import apiClient from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

const fetchMe = () => apiClient.get('/auth/me').then((r) => r.data.data ?? r.data);

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-2xl border-2 border-border bg-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start gap-4 animate-pulse">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex gap-2">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-4 w-16 rounded-full bg-muted" />
            <div className="h-4 w-16 rounded-full bg-muted" />
          </div>
          <div className="h-3 w-32 rounded bg-muted" />
          <div className="flex gap-4 mt-1">
            <div className="h-3 w-28 rounded bg-muted" />
            <div className="h-3 w-12 rounded bg-muted" />
          </div>
        </div>
      </div>
      <div className="flex gap-2 shrink-0 self-end sm:self-start">
        <div className="h-8 w-20 rounded-lg bg-muted" />
      </div>
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar({ user, onLogout }) {
  const [open, setOpen] = useState(false);

  function initials(name = '') {
    return name
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b-2 border-border bg-background/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <Link to="/home" className="flex items-center gap-2.5 shrink-0 group">
          <PeerPulseLogoMark
            size={36}
            className="shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 drop-shadow-[3px_4px_0_rgba(0,0,0,0.12)] dark:drop-shadow-[4px_5px_0_rgba(0,0,0,0.45)]"
          />
          <span className="text-base font-display font-extrabold tracking-tight uppercase">
            PeerPulse
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {[
            { label: 'Home', href: '/home' },
            { label: 'Sessions', href: '/sessions', active: true },
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
              <div className="w-7 h-7 rounded-full bg-primary/15 text-primary font-semibold text-xs flex items-center justify-center shrink-0">
                {initials(user?.name ?? '')}
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

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 pt-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="gap-1"
      >
        <ChevronLeft className="w-4 h-4" />
        Prev
      </Button>

      <div className="flex items-center gap-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${
              p === currentPage
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent border-2 border-transparent'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="gap-1"
      >
        Next
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

const EMPTY_MESSAGES = {
  '': 'No sessions yet.',
  pending: 'No pending sessions.',
  accepted: 'No accepted sessions.',
  completed: 'No completed sessions.',
  cancelled: 'No cancelled sessions.',
};

function EmptyState({ status }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <svg className="w-7 h-7 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-foreground">{EMPTY_MESSAGES[status] ?? 'No sessions.'}</p>
      <p className="text-xs text-muted-foreground mt-1">
        {status === '' || status === 'pending'
          ? 'Book a session with a tutor to get started.'
          : 'Nothing here yet.'}
      </p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const LIMIT = 10;

export default function SessionsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  // Read initial status from URL
  const [activeTab, setActiveTab] = useState(() => searchParams.get('status') ?? '');
  const [page, setPage] = useState(() => Number(searchParams.get('page') ?? 1));

  // Keep URL in sync
  useEffect(() => {
    const params = {};
    if (activeTab) params.status = activeTab;
    if (page > 1) params.page = String(page);
    setSearchParams(params, { replace: true });
  }, [activeTab, page, setSearchParams]);

  // Reset to page 1 when tab changes
  const handleTabChange = (value) => {
    setActiveTab(value);
    setPage(1);
  };

  // Auth
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    retry: false,
  });

  const role = user?.role ?? 'student';

  // Bookings
  const bookingParams = { page, limit: LIMIT };
  if (activeTab) bookingParams.status = activeTab;

  const { data: bookingsData, isLoading: bookingsLoading } = useBookings(bookingParams);

  const bookings = bookingsData?.bookings ?? [];
  const totalPages = bookingsData?.totalPages ?? 1;
  const currentPage = bookingsData?.currentPage ?? page;

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (_) {
      // swallow
    }
    toast({ title: 'Signed out', description: 'See you next time!' });
    navigate('/login');
  };

  // Action handlers — open modals in Step 7; log for now
  const handleCancel = (booking) => console.log('open cancel modal', booking);
  const handleAccept = (booking) => console.log('open accept modal', booking);
  const handleDecline = (booking) => console.log('open decline modal', booking);
  const handleComplete = (booking) => console.log('open complete modal', booking);

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <PeerPulseLogoMark
          size={56}
          className="animate-pulse drop-shadow-[4px_5px_0_rgba(0,0,0,0.12)] dark:drop-shadow-[5px_6px_0_rgba(0,0,0,0.4)]"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} onLogout={handleLogout} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-display font-extrabold tracking-tight">My Sessions</h1>
          {/* Slot for Calendar/List view toggle — Step 8 */}
          <div className="view-toggle-slot" />
        </div>

        {/* Status tab bar */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-muted border-2 border-border mb-6 overflow-x-auto">
          {TABS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => handleTabChange(value)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-xl text-sm font-semibold transition-colors ${
                activeTab === value
                  ? 'bg-background text-foreground shadow-sm border-2 border-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Session list */}
        <div className="space-y-3">
          {bookingsLoading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : bookings.length === 0 ? (
            <EmptyState status={activeTab} />
          ) : (
            bookings.map((booking) => (
              <SessionCard
                key={booking._id ?? booking.id}
                booking={booking}
                role={role}
                onCancel={handleCancel}
                onAccept={handleAccept}
                onDecline={handleDecline}
                onComplete={handleComplete}
              />
            ))
          )}
        </div>

        {/* Pagination */}
        {!bookingsLoading && bookings.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        )}
      </main>
    </div>
  );
}
