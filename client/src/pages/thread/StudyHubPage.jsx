import React, { useEffect, useState } from 'react';
import { useThreadContext } from '../../context/ThreadContext';
import { ThreadCard } from '../../components/thread/ThreadCard';
import { Loader } from '../../components/thread/Loader';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { THREAD_SUBJECTS } from '../../utils/constants';
import { CreateThreadModal } from '../../components/thread/CreateThreadModal';
import { Navbar } from '../../components/thread/Navbar';
import { MessageSquare, Plus, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const StudyHubPage = () => {
  const { threads, loading, fetchThreads } = useThreadContext();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [sort, setSort] = useState('latest');
  const [assignmentFilter, setAssignmentFilter] = useState('all'); 
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isTutor = user?.role === 'tutor' || user?.role === 'admin';

  useEffect(() => {
    let assignedTutor;
    if (assignmentFilter === 'me') {
      assignedTutor = user?._id || user?.id;
    } else if (assignmentFilter === 'unassigned') {
      assignedTutor = 'unassigned';
    }

    fetchThreads({ search, subject, sort, assignedTutor, page });
  }, [fetchThreads, search, subject, sort, assignmentFilter, page, user]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 md:py-8 space-y-6">
        <div className="bg-card pp-brutal-shadow border-2 border-border rounded-2xl p-6 md:p-10 relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border-2 border-primary/20 text-xs font-bold tracking-wide uppercase mb-3">
              <MessageSquare className="w-4 h-4" /> Community Hub
            </div>
            <h1 className="text-3xl md:text-5xl font-display font-black tracking-tight mb-3">Join the Discussion</h1>
            <p className="text-muted-foreground md:text-lg max-w-xl font-medium leading-relaxed">
              Connect with peers, ask challenging questions, and share your knowledge with the student community.
            </p>
          </div>
          <Button 
            onClick={() => setIsModalOpen(true)}
            size="lg"
            className="relative z-10 flex items-center gap-2 pp-brutal-shadow shrink-0 h-12 px-6 font-bold text-base bg-primary hover:bg-primary/90 text-primary-foreground transition-transform hover:-translate-y-1"
          >
            <Plus className="w-5 h-5" />
            New Thread
          </Button>

          {/* Decorative Pattern */}
          <div className="absolute -right-8 -top-8 text-primary/5 pointer-events-none rotate-12">
            <svg width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </div>
        </div>

        <div className="bg-card border-2 border-border rounded-xl p-4 pp-brutal-shadow mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search discussions..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 w-full border-2 focus-visible:ring-0 transition-colors"
              />
            </div>
            
            <select 
              className="flex h-10 w-full rounded-md border-2 border-input bg-background px-3 py-2 text-sm md:w-48 font-medium focus:outline-none"
              value={subject} 
              onChange={(e) => setSubject(e.target.value)}
            >
              <option value="">All Subjects</option>
              {THREAD_SUBJECTS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select 
              className="flex h-10 w-full rounded-md border-2 border-input bg-background px-3 py-2 text-sm md:w-48 font-medium focus:outline-none"
              value={sort} 
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="latest">Latest</option>
              <option value="mostUpvoted">Most Upvoted</option>
            </select>

            {isTutor && (
              <select 
                className="flex h-10 w-full rounded-md border-2 border-input bg-background px-3 py-2 text-sm md:w-48 font-medium focus:outline-none"
                value={assignmentFilter} 
                onChange={(e) => setAssignmentFilter(e.target.value)}
              >
                <option value="all">All Threads</option>
                <option value="me">Assigned to Me</option>
                <option value="unassigned">Community Only</option>
              </select>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader />
          </div>
        ) : threads.length > 0 ? (
          <div className="grid gap-4">
            {threads.map(thread => (
              <ThreadCard key={thread.id || thread._id} thread={thread} />
            ))}
            <div className="flex justify-between items-center mt-6 pt-4 border-t-2 border-border/50">
              <Button 
                variant="outline" 
                className="border-2 font-semibold"
                onClick={() => setPage(page - 1)} 
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm font-medium text-muted-foreground">Page {page}</span>
              <Button 
                variant="outline" 
                className="border-2 font-semibold"
                onClick={() => setPage(page + 1)}
                disabled={threads.length < 10}
              >
                Next
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-card border-2 border-border border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No threads found</h3>
            <p className="text-muted-foreground max-w-sm mb-4">
              We couldn't find any discussions matching your current filters. Try tweaking your search or ask a new question!
            </p>
            <Button onClick={() => setIsModalOpen(true)} variant="outline" className="border-2">
              <Plus className="w-4 h-4 mr-2" /> Start Discussion
            </Button>
          </div>
        )}
      </main>

      <CreateThreadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

export default StudyHubPage;
