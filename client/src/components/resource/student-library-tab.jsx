import { useMemo } from 'react';
import { ResourceCard } from '@/components/resource/resource-card';
import { ResourceFilters } from '@/components/resource/resource-filters';

export function StudentLibraryTab({
  approvedTutors,
  selectedTutorId,
  setSelectedTutorId,
  searchTerm,
  setSearchTerm,
  activeFilter,
  setActiveFilter,
  filteredResources,
  isLoadingResources,
  isResourcesError,
}) {
  const selectedTutor = useMemo(
    () => approvedTutors.find((tutor) => tutor._id === selectedTutorId) || null,
    [approvedTutors, selectedTutorId],
  );

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border bg-gradient-to-br from-blue-50 via-cyan-50 to-white p-4 md:p-6">
        <div className="mb-5">
          <h2 className="text-2xl font-bold tracking-tight">My Libraries</h2>
          <p className="text-sm text-muted-foreground">
            Quick access to the tutors who approved your requests.
          </p>
        </div>

        {approvedTutors.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-white/70 p-6 text-center">
            <p className="text-base font-medium">No approved libraries yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Use the Discover tab to request access and build your library shelf.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {approvedTutors.map((tutor) => {
              const isSelected = tutor._id === selectedTutorId;
              return (
                <button
                  key={tutor._id}
                  onClick={() => setSelectedTutorId(tutor._id)}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-500'
                      : 'bg-white hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-semibold text-gray-900">{tutor.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{tutor.email}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {selectedTutorId && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">
              Resources from {selectedTutor?.name || 'Selected Tutor'}
            </h2>
            <p className="text-sm text-muted-foreground">
              Search and filter resources within the currently opened library.
            </p>
          </div>

          <ResourceFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
          />

          {isLoadingResources ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : isResourcesError ? (
            <div className="text-center py-20 text-destructive">
              <p className="text-lg">Error loading resources. Please try again.</p>
            </div>
          ) : filteredResources.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <p className="text-lg">No resources found for the selected library and filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredResources.map((resource) => (
                <ResourceCard key={resource._id} resource={resource} isOwner={false} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
