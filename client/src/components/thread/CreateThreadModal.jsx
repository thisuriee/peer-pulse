import React, { useState, useEffect } from 'react';
import { useThreadContext } from '../../context/ThreadContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { THREAD_SUBJECTS } from '../../utils/constants';
import { useToast } from '../../hooks/use-toast';
import { getTutors } from '../../lib/booking-api';

export const CreateThreadModal = ({ isOpen, onClose }) => {
  const { createThread } = useThreadContext();
  const { toast } = useToast();
  
  const [tutors, setTutors] = useState([]);
  const [loadingTutors, setLoadingTutors] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchTutors = async () => {
        setLoadingTutors(true);
        try {
          const fetchedTutors = await getTutors();
          setTutors(fetchedTutors || []);
        } catch (error) {
          console.error("Failed to fetch tutors", error);
        } finally {
          setLoadingTutors(false);
        }
      };
      fetchTutors();
    }
  }, [isOpen]);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    subject: '',
    assignedTutor: ''
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
      await createThread({
        ...formData,
        assignedTutor: formData.assignedTutor || undefined,
      });
      toast({ title: 'Success', description: 'Thread created successfully' });
      setFormData({ title: '', content: '', subject: '', assignedTutor: '' });
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

          <div>
            <label className="text-sm font-medium mb-1 block">Assign to Tutor (Optional)</label>
            <select 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={formData.assignedTutor}
              onChange={e => setFormData({ ...formData, assignedTutor: e.target.value })}
              disabled={submitting || loadingTutors}
            >
              <option value="">Community Post (No Tutor)</option>
              {tutors.map(t => (
                <option key={t._id} value={t._id}>{t.name}</option>
              ))}
            </select>
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
