import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { resourceApi } from '@/lib/resource-api';
import { useToast } from './use-toast';

export const useResources = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ['resources', filters],
    queryFn: () => resourceApi.getAll(filters),
    keepPreviousData: true,
    ...options,
  });
};

export const useResource = (id) => {
  return useQuery({
    queryKey: ['resource', id],
    queryFn: () => resourceApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateResource = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (formData) => resourceApi.create(formData),
    onSuccess: () => {
      // Invalidate to refetch fresh data correctly across all queries
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
    onError: (error) => {
      toast({
        title: 'Upload failed',
        description: error.message || 'There was an error uploading your resource.',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateResource = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, formData }) => resourceApi.update(id, formData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['resource', variables.id] });
      toast({
        title: 'Success',
        description: 'Resource updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Update failed',
        description: error.message || 'There was an error updating your resource.',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteResource = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id) => resourceApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      toast({
        title: 'Deleted',
        description: 'Resource deleted successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Delete failed',
        description: error.message || 'There was an error deleting your resource.',
        variant: 'destructive',
      });
    },
  });
};
