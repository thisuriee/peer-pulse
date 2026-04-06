import React, { useEffect, useState } from 'react';
import { useThreadContext } from '../context/ThreadContext';
import { ThreadCard } from '../components/ThreadCard';
import { Loader } from '../components/Loader';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { THREAD_SUBJECTS } from '../utils/constants';
import { CreateThreadModal } from '../components/CreateThreadModal';
import { Navbar } from '../components/Navbar';
import { MessageSquare, Plus, Search } from 'lucide-react';

const StudyHubPage = () => {
  const { threads, loading, fetchThreads } = useThreadContext();
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [sort, setSort] = useState('latest');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchThreads({ search, subject, sort, page });
  }, [fetchThreads, search, subject, sort, page]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 md:py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight">Community Hub</h1>
            <p className="text-muted-foreground mt-1">Connect, ask questions, and share knowledge.</p>
          </div>
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 pp-brutal-shadow shrink-0"
          >
            <Plus className="w-4 h-4" />
            New Thread
          </Button>
        </div>

        <div className="bg-card border-2 border-border rounded-xl p-4 pp-brutal-shadow">
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
              <option value="upvotes">Most Upvoted</option>
            </select>
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
