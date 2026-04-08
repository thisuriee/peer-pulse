import React, { useState } from 'react';
import { useThreadContext } from '../context/ThreadContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { THREAD_SUBJECTS } from '../utils/constants';
import { useToast } from '../hooks/use-toast';

export const CreateThreadModal = ({ isOpen, onClose }) => {
  const { createThread } = useThreadContext();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    subject: ''
  });
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.content || !formData.subject) {
      toast({ title: 'Validation Error', description: 'All fields are required', variant: 'destructive' });
      return;
    }
    
    setSubmitting(true);
    try {
      await createThread(formData);
      toast({ title: 'Success', description: 'Thread created successfully' });
      setFormData({ title: '', content: '', subject: '' });
      onClose();
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to create thread';
      toast({ title: 'Error', description: errorMsg, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex justify-center items-center p-4">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-md p-6">
        <h2 className="text-2xl font-bold mb-4">Create New Thread</h2>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Title</label>
            <Input 
              value={formData.title} 
              onChange={e => setFormData({ ...formData, title: e.target.value })} 
              placeholder="What is your question?"
              disabled={submitting}
            />
          </div>
          
          <div>
            <label className="text-sm font-medium mb-1 block">Subject</label>
            <select 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={formData.subject}
              onChange={e => setFormData({ ...formData, subject: e.target.value })}
              disabled={submitting}
            >
              <option value="">Select a subject</option>
              {THREAD_SUBJECTS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-1 block">Content</label>
            <textarea
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={formData.content}
              onChange={e => setFormData({ ...formData, content: e.target.value })}
              placeholder="Explain your problem..."
              disabled={submitting}
            />
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Thread'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
