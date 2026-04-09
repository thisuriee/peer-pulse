import { useState, useMemo } from 'react';
import { ResourceCard } from '@/components/resource/resource-card';
import { ResourceFilters } from '@/components/resource/resource-filters';
import { UploadResourceModal } from '@/components/resource/upload-resource-modal';
import { Navbar } from '@/components/thread/Navbar';
import { useAuth } from '@/context/AuthContext';
import { useResources } from '@/hooks/use-resources';

const ResourcePage = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [viewMode, setViewMode] = useState('all'); // 'all' or 'my'

  // Fetch resources from API
  const { data: responseData, isLoading, isError } = useResources();
  const resources = responseData?.data || [];

  const isTutor = user?.role === 'tutor' || user?.role === 'admin';

  const filteredResources = useMemo(() => {
    return resources.filter((res) => {
      // My resources matching based on actual API data and real auth 'user'
      if (viewMode === 'my') {
        const tutorId = res.tutor_id?._id || res.tutor_id;
        if (tutorId !== user?._id) return false;
      }

      // Type matching
      if (activeFilter !== 'all' && res.type.toLowerCase() !== activeFilter) {
        return false;
      }

      // Search term matching
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const inTitle = res.title?.toLowerCase().includes(query) || false;
        const inDesc = res.description?.toLowerCase().includes(query) || false;
        return inTitle || inDesc;
      }

      return true;
    });
  }, [resources, activeFilter, searchTerm, viewMode, user?._id]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Study Resources</h1>
            <p className="text-muted-foreground mt-1">Explore materials shared by tutors.</p>
          </div>

          <div className="flex gap-2">
            {isTutor && viewMode === 'all' && (
              <button
                onClick={() => setViewMode('my')}
                className="text-sm font-medium hover:underline text-primary"
              >
                View My Resources
              </button>
            )}
            {isTutor && viewMode === 'my' && (
              <button
                onClick={() => setViewMode('all')}
                className="text-sm font-medium hover:underline text-primary"
              >
                View All Resources
              </button>
            )}
            {isTutor && <UploadResourceModal />}
          </div>
        </div>

        <ResourceFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : isError ? (
          <div className="text-center py-20 text-destructive">
            <p className="text-lg">Error loading resources. Please try again.</p>
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg">No resources found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map((resource) => (
              <ResourceCard
                key={resource._id}
                resource={resource}
                isOwner={user?._id === (resource.tutor_id?._id || resource.tutor_id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ResourcePage;
