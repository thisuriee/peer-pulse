import React, { createContext, useState, useContext, useCallback } from 'react';
import { threadService } from '../services/threadService';

const ThreadContext = createContext();

export const ThreadProvider = ({ children }) => {
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchThreads = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await threadService.getThreads(params);
      setThreads(resp.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to open threads');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchThreadById = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await threadService.getThreadById(id);
      setSelectedThread(resp.data || resp);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch thread details');
    } finally {
      setLoading(false);
    }
  }, []);

  const createThread = async (data) => {
    const resp = await threadService.createThread(data);
    const newThread = resp.data || resp;
    setThreads(prev => [newThread, ...prev]);
    return newThread;
  };

  const upvoteThread = async (id) => {
    const resp = await threadService.upvoteThread(id);
    const { upvoteCount } = resp.data || resp;
    
    setThreads(prev => prev.map(t => 
      (t._id || t.id) === id ? { ...t, upvoteCount, upvotes: Array(upvoteCount).fill('user') } : t
    ));
    
    if (selectedThread && (selectedThread._id || selectedThread.id) === id) {
      setSelectedThread(prev => ({ ...prev, upvoteCount, upvotes: Array(upvoteCount).fill('user') }));
    }
  };

  const addReply = async (threadId, data) => {
    const reply = await threadService.addReply(threadId, data);
    setSelectedThread(prev => ({
      ...prev,
      replies: [...prev.replies, reply]
    }));
  };

  return (
    <ThreadContext.Provider value={{
      threads,
      selectedThread,
      loading,
      error,
      fetchThreads,
      fetchThreadById,
      createThread,
      upvoteThread,
      addReply
    }}>
      {children}
    </ThreadContext.Provider>
  );
};

export const useThreadContext = () => useContext(ThreadContext);
