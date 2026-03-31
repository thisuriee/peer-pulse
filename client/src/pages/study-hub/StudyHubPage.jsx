import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader,
  Plus,
  Search,
  SortDesc,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ThreadCard from "@/components/study-hub/ThreadCard";
import CreateThreadModal from "@/components/study-hub/CreateThreadModal";
import { getThreadsQueryFn } from "@/lib/thread-api";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────
const SUBJECTS = [
  "All",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
  "History",
  "Geography",
  "Literature",
  "Economics",
  "Philosophy",
  "Engineering",
  "Medicine",
  "Law",
  "Business",
  "Other",
];

const SORT_OPTIONS = [
  { value: "latest", label: "Latest" },
  { value: "mostUpvoted", label: "Most Upvoted" },
];

// ─── StudyHubPage ─────────────────────────────────────────────────────────────
const StudyHubPage = () => {
  const [page, setPage] = useState(1);
  const [subject, setSubject] = useState("");
  const [sort, setSort] = useState("latest");
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ── Fetch threads ──────────────────────────────────────────────────────────
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["threads", { page, subject, sort }],
    queryFn: () =>
      getThreadsQueryFn({ page, limit: 10, subject: subject || undefined, sort }),
    keepPreviousData: true,
  });

  const threads = data?.data || [];
  const pagination = data?.pagination || {};

  // ── Client-side search filter (title / content) ────────────────────────────
  const filteredThreads = search.trim()
    ? threads.filter(
        (t) =>
          t.title?.toLowerCase().includes(search.toLowerCase()) ||
          t.content?.toLowerCase().includes(search.toLowerCase())
      )
    : threads;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSubjectChange = (s) => {
    setSubject(s === "All" ? "" : s);
    setPage(1);
  };

  const handleSortChange = (e) => {
    setSort(e.target.value);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BookOpen size={22} className="text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  Study Hub
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Ask questions, share knowledge, get answers
                </p>
              </div>
            </div>

            <Button
              id="create-thread-btn"
              onClick={() => setIsModalOpen(true)}
              className="gap-2 shrink-0"
              size="sm"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">New Thread</span>
              <span className="sm:hidden">Post</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* ── Toolbar ────────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 mb-6">
          {/* Search + Sort */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <Input
                id="thread-search"
                placeholder="Search discussions…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            <div className="relative flex items-center">
              <SortDesc
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <select
                id="sort-select"
                value={sort}
                onChange={handleSortChange}
                className="h-9 pl-9 pr-8 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subject filter chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <Filter size={13} className="text-muted-foreground shrink-0" />
            <div className="flex items-center gap-1.5">
              {SUBJECTS.map((s) => {
                const active = s === "All" ? subject === "" : subject === s;
                return (
                  <button
                    key={s}
                    id={`subject-filter-${s.toLowerCase().replace(" ", "-")}`}
                    onClick={() => handleSubjectChange(s)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-150 border",
                      active
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Thread List ───────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <Loader size={32} className="animate-spin text-primary" />
            <p className="text-sm">Loading discussions…</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <AlertCircle size={36} className="text-destructive" />
            <p className="text-sm font-medium text-foreground">
              Failed to load threads
            </p>
            <p className="text-xs">{error?.message || "Please try again later."}</p>
          </div>
        ) : filteredThreads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <BookOpen size={36} className="opacity-30" />
            <p className="text-sm font-medium text-foreground">
              No discussions found
            </p>
            <p className="text-xs">
              {search
                ? "Try adjusting your search terms."
                : "Be the first to start a discussion!"}
            </p>
            {!search && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsModalOpen(true)}
                className="mt-2 gap-2"
              >
                <Plus size={14} />
                Start a Thread
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredThreads.map((thread) => (
              <ThreadCard key={thread._id} thread={thread} />
            ))}
          </div>
        )}

        {/* ── Pagination ────────────────────────────────────────────────────── */}
        {!isLoading && pagination.pages > 1 && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Page{" "}
              <span className="font-semibold text-foreground">{pagination.page}</span>{" "}
              of{" "}
              <span className="font-semibold text-foreground">{pagination.pages}</span>
              {" "}&mdash; {pagination.total} thread{pagination.total !== 1 ? "s" : ""}
            </p>

            <div className="flex items-center gap-2">
              <Button
                id="prev-page-btn"
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="gap-1"
              >
                <ChevronLeft size={15} />
                Prev
              </Button>
              <Button
                id="next-page-btn"
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page >= pagination.pages}
                className="gap-1"
              >
                Next
                <ChevronRight size={15} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Create Thread Modal ────────────────────────────────────────────── */}
      <CreateThreadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};

export default StudyHubPage;
