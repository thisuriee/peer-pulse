import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { libraryAccessApi } from '@/lib/library-access-api';
import { useToast } from '@/hooks/use-toast';

export const useTutorDirectory = (params = {}, options = {}) => {
  return useQuery({
    queryKey: ['library-access', 'tutor-directory', params],
    queryFn: () => libraryAccessApi.getTutorDirectory(params),
    ...options,
  });
};

export const useTutorRequests = (params = {}, options = {}) => {
  return useQuery({
    queryKey: ['library-access', 'tutor-requests', params],
    queryFn: () => libraryAccessApi.getTutorRequests(params),
    ...options,
  });
};

export const useStudentAccesses = (params = {}, options = {}) => {
  return useQuery({
    queryKey: ['library-access', 'student-accesses', params],
    queryFn: () => libraryAccessApi.getStudentAccesses(params),
    ...options,
  });
};

export const useRequestLibraryAccess = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (tutorId) => libraryAccessApi.requestAccess(tutorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-access', 'tutor-directory'] });
      queryClient.invalidateQueries({ queryKey: ['library-access', 'student-accesses'] });
      toast({
        title: 'Request sent',
        description: 'Your access request has been sent to the tutor.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Request failed',
        description: error?.message || 'Unable to send request right now.',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateLibraryAccessStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ requestId, status }) =>
      libraryAccessApi.updateAccessStatus({ requestId, status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['library-access', 'tutor-requests'] });
      queryClient.invalidateQueries({ queryKey: ['library-access', 'student-accesses'] });
      queryClient.invalidateQueries({ queryKey: ['library-access', 'tutor-directory'] });

      toast({
        title: 'Access updated',
        description: `Request marked as ${variables.status}.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Update failed',
        description: error?.message || 'Unable to update this request.',
        variant: 'destructive',
      });
    },
  });
};
