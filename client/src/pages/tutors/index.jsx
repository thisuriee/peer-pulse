import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users, ArrowLeft } from 'lucide-react';
import { useTutors } from '@/hooks/use-bookings';
import TutorCard from '@/components/booking/tutor-card';
import BookingRequestModal from '@/components/booking/booking-request-modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PeerPulseLogoMark } from '@/components/peer-pulse-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

// ─── Subject filter pills ─────────────────────────────────────────────────────
// Values must match strings tutors enter as skills on the User model,
// since the backend queries: query.skills = { $in: [subject] }
const COMMON_SUBJECTS = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'Computer Science',
  'English',
  'History',
  'Economics',
  'Statistics',
  'Programming',
];

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-2xl border-2 border-border bg-card p-5 flex flex-col gap-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-muted shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-3.5 bg-muted rounded-full w-2/3" />
          <div className="h-3 bg-muted rounded-full w-1/2" />
        </div>
        <div className="h-5 bg-muted rounded-full w-20 shrink-0" />
      </div>
      <div className="space-y-1.5">
        <div className="h-3 bg-muted rounded-full w-full" />
        <div className="h-3 bg-muted rounded-full w-4/5" />
      </div>
      <div className="flex gap-1.5">
        <div className="h-5 bg-muted rounded-full w-20" />
        <div className="h-5 bg-muted rounded-full w-16" />
        <div className="h-5 bg-muted rounded-full w-24" />
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        <div className="h-4 bg-muted rounded-full w-16" />
        <div className="h-8 bg-muted rounded-full w-24" />
      </div>
    </div>
  );
}

// ─── Top navigation bar ───────────────────────────────────────────────────────

function PageNav() {
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

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1">
          {[
            { label: 'Home', href: '/home' },
            { label: 'Sessions', href: '/sessions' },
            { label: 'Resources', href: '/resources' },
            { label: 'Reviews', href: '/reviews' },
            { label: 'Community', href: '/threads' },
            { label: 'Tutors', href: '/tutors', active: true },
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
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs h-8"
            asChild
          >
            <Link to="/home">
              <ArrowLeft className="w-3.5 h-3.5" />
              Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TutorsPage() {
  // Controlled search input — debounced 300 ms before applying client-side filter
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Active subject pill — passed as a server-side filter param
  const [selectedSubject, setSelectedSubject] = useState('');

  // The tutor for whom the booking modal is open (null = modal closed)
  const [selectedTutor, setSelectedTutor] = useState(null);

  // Server-side subject filter; name search is applied client-side below
  const queryParams = selectedSubject ? { subject: selectedSubject } : {};
  const { data: tutors = [], isLoading, isError } = useTutors(queryParams);

  // Client-side name filter applied on top of the server result
  const filtered = debouncedSearch
    ? tutors.filter((t) =>
        t.name?.toLowerCase().includes(debouncedSearch.toLowerCase()),
      )
    : tutors;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageNav />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        {/* ── Page header ─────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1">
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl uppercase tracking-tight">
              Find a Tutor
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Browse available tutors and book a session instantly.
            </p>
          </div>

          {/* Search input */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="Search by name…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* ── Subject filter pills ─────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedSubject('')}
            className={cn(
              'px-3.5 py-1.5 rounded-full text-xs font-semibold border-2 transition-colors',
              selectedSubject === ''
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground',
            )}
          >
            All
          </button>
          {COMMON_SUBJECTS.map((subject) => (
            <button
              key={subject}
              onClick={() =>
                setSelectedSubject((prev) => (prev === subject ? '' : subject))
              }
              className={cn(
                'px-3.5 py-1.5 rounded-full text-xs font-semibold border-2 transition-colors',
                selectedSubject === subject
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground',
              )}
            >
              {subject}
            </button>
          ))}
        </div>

        {/* ── Results count ────────────────────────────────────────────── */}
        {!isLoading && !isError && (
          <p className="text-xs text-muted-foreground">
            {filtered.length === 0
              ? 'No tutors found'
              : `${filtered.length} tutor${filtered.length === 1 ? '' : 's'} found`}
            {selectedSubject && ` in ${selectedSubject}`}
            {debouncedSearch && ` matching "${debouncedSearch}"`}
          </p>
        )}

        {/* ── Grid ─────────────────────────────────────────────────────── */}
        {isError ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <Users className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">Failed to load tutors</p>
            <p className="text-xs mt-1">Please refresh the page or try again later.</p>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <Users className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No tutors found</p>
            <p className="text-xs mt-1">
              {selectedSubject || debouncedSearch
                ? 'Try adjusting your search or subject filter.'
                : 'No tutors have registered yet.'}
            </p>
            {(selectedSubject || debouncedSearch) && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4 h-8 text-xs"
                onClick={() => {
                  setSelectedSubject('');
                  setSearchInput('');
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((tutor) => (
              <TutorCard
                key={tutor._id}
                tutor={tutor}
                onBook={(t) => setSelectedTutor(t)}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Booking modal ────────────────────────────────────────────── */}
      <BookingRequestModal
        open={!!selectedTutor}
        onOpenChange={(open) => { if (!open) setSelectedTutor(null); }}
        tutor={selectedTutor}
      />
    </div>
  );
}
