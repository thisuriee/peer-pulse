import { useEffect, useMemo, useState } from 'react';
import { ResourceCard } from '@/components/resource/resource-card';
import { ResourceFilters } from '@/components/resource/resource-filters';
import { UploadResourceModal } from '@/components/resource/upload-resource-modal';
import { Navbar } from '@/components/thread/Navbar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StudentLibraryTab } from '@/components/resource/student-library-tab';
import { DiscoverTutorsTab } from '@/components/resource/discover-tutors-tab';
import { StudentRequestsTab } from '@/components/resource/student-requests-tab';
import { useAuth } from '@/context/AuthContext';
import { useResources } from '@/hooks/use-resources';
import {
  useRequestLibraryAccess,
  useTutorDirectory,
  useTutorRequests,
  useUpdateLibraryAccessStatus,
} from '@/hooks/use-library-access';

const ResourcePage = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [tutorSearch, setTutorSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedTutorId, setSelectedTutorId] = useState('');

  const isTutor = user?.role === 'tutor' || user?.role === 'admin';
  const isStudent = user?.role === 'student';

  const resourceFilters = useMemo(() => {
    const filter = {
      search: searchTerm || undefined,
      type: activeFilter !== 'all' ? activeFilter : undefined,
    };

    if (isStudent && selectedTutorId) {
      filter.tutorId = selectedTutorId;
    }

    return filter;
  }, [activeFilter, isStudent, searchTerm, selectedTutorId]);

  const {
    data: responseData,
    isLoading: isLoadingResources,
    isError: isResourcesError,
  } = useResources(resourceFilters, {
    enabled: !!user && (isTutor || (isStudent && !!selectedTutorId)),
  });

  const { data: tutorDirectoryData, isLoading: isLoadingTutorDirectory } = useTutorDirectory(
    { search: tutorSearch || undefined },
    { enabled: !!user && isStudent },
  );

  const { data: tutorRequestsData, isLoading: isLoadingTutorRequests } = useTutorRequests(
    { status: 'pending' },
    { enabled: !!user && isTutor },
  );

  const { data: approvedRequestsData, isLoading: isLoadingApprovedRequests } = useTutorRequests(
    { status: 'approved' },
    { enabled: !!user && isTutor },
  );

  const { mutate: requestLibraryAccess, isPending: isRequestingAccess } = useRequestLibraryAccess();
  const { mutate: updateAccessStatus, isPending: isUpdatingRequestStatus } =
    useUpdateLibraryAccessStatus();

  const resources = responseData?.data || [];
  const tutorDirectory = tutorDirectoryData?.data || [];
  const tutorRequests = tutorRequestsData?.data || [];
  const approvedRequests = approvedRequestsData?.data || [];

  const approvedTutors = useMemo(
    () => tutorDirectory.filter((tutor) => tutor.accessStatus === 'approved'),
    [tutorDirectory],
  );

  const pendingTutors = useMemo(
    () => tutorDirectory.filter((tutor) => tutor.accessStatus === 'pending'),
    [tutorDirectory],
  );

  const availableTutors = useMemo(
    () => tutorDirectory.filter((tutor) => tutor.accessStatus === 'none'),
    [tutorDirectory],
  );

  const rejectedTutors = useMemo(
    () =>
      tutorDirectory.filter(
        (tutor) => tutor.accessStatus === 'rejected' || tutor.accessStatus === 'revoked',
      ),
    [tutorDirectory],
  );

  const selectedTutor = useMemo(
    () => approvedTutors.find((tutor) => tutor._id === selectedTutorId) || null,
    [approvedTutors, selectedTutorId],
  );

  useEffect(() => {
    if (!isStudent) return;

    if (!approvedTutors.length) {
      setSelectedTutorId('');
      return;
    }

    const stillSelected = approvedTutors.some((tutor) => tutor._id === selectedTutorId);
    if (!stillSelected) {
      setSelectedTutorId(approvedTutors[0]._id);
    }
  }, [approvedTutors, isStudent, selectedTutorId]);

  const filteredResources = useMemo(() => {
    return resources;
  }, [resources]);

  const getStatusLabelClass = (status) => {
    if (status === 'approved') return 'bg-emerald-100 text-emerald-700';
    if (status === 'pending') return 'bg-amber-100 text-amber-700';
    if (status === 'rejected') return 'bg-rose-100 text-rose-700';
    if (status === 'revoked') return 'bg-slate-200 text-slate-700';
    return 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Study Resources</h1>
            <p className="text-muted-foreground mt-1">
              {isTutor
                ? 'Manage your resource library and approve student access requests.'
                : 'Browse tutors, request access, and view approved libraries.'}
            </p>
          </div>

          <div className="flex gap-2">{isTutor && <UploadResourceModal />}</div>
        </div>

        {isTutor && (
          <section className="mb-8 rounded-lg border p-4 md:p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Incoming Access Requests</h2>
              <p className="text-sm text-muted-foreground">
                Approve or reject students asking to view your resources.
              </p>
            </div>

            {isLoadingTutorRequests ? (
              <p className="text-sm text-muted-foreground">Loading pending requests...</p>
            ) : tutorRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending requests right now.</p>
            ) : (
              <div className="space-y-3">
                {tutorRequests.map((request) => (
                  <div
                    key={request._id}
                    className="flex flex-col gap-3 rounded-md border p-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-medium">{request.student_id?.name || 'Student'}</p>
                      <p className="text-sm text-muted-foreground">{request.student_id?.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={isUpdatingRequestStatus}
                        onClick={() =>
                          updateAccessStatus({ requestId: request._id, status: 'approved' })
                        }
                        className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={isUpdatingRequestStatus}
                        onClick={() =>
                          updateAccessStatus({ requestId: request._id, status: 'rejected' })
                        }
                        className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6">
              <h3 className="text-base font-semibold">Approved Students</h3>
              <p className="mb-3 text-sm text-muted-foreground">
                Revoke access for any student when needed.
              </p>

              {isLoadingApprovedRequests ? (
                <p className="text-sm text-muted-foreground">Loading approved students...</p>
              ) : approvedRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No approved students yet.</p>
              ) : (
                <div className="space-y-3">
                  {approvedRequests.map((request) => (
                    <div
                      key={request._id}
                      className="flex flex-col gap-3 rounded-md border p-3 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="font-medium">{request.student_id?.name || 'Student'}</p>
                        <p className="text-sm text-muted-foreground">{request.student_id?.email}</p>
                      </div>
                      <button
                        type="button"
                        disabled={isUpdatingRequestStatus}
                        onClick={() =>
                          updateAccessStatus({ requestId: request._id, status: 'revoked' })
                        }
                        className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-60"
                      >
                        Revoke Access
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {isStudent && (
          <Tabs
            defaultValue={approvedTutors.length > 0 ? 'library' : 'discover'}
            className="w-full space-y-6"
          >
            <TabsList className="grid w-full sm:w-[400px] grid-cols-3">
              <TabsTrigger value="library">My Library</TabsTrigger>
              <TabsTrigger value="discover">Discover</TabsTrigger>
              <TabsTrigger value="requests">
                Requests{' '}
                <span className="ml-2 bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 text-xs">
                  {pendingTutors.length}
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="library" className="space-y-6 outline-none">
              <StudentLibraryTab
                approvedTutors={approvedTutors}
                selectedTutorId={selectedTutorId}
                setSelectedTutorId={setSelectedTutorId}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                activeFilter={activeFilter}
                setActiveFilter={setActiveFilter}
                filteredResources={filteredResources}
                isLoadingResources={isLoadingResources}
                isResourcesError={isResourcesError}
              />
            </TabsContent>

            <TabsContent value="discover" className="outline-none">
              <DiscoverTutorsTab
                availableTutors={availableTutors}
                isLoadingTutorDirectory={isLoadingTutorDirectory}
                tutorSearch={tutorSearch}
                setTutorSearch={setTutorSearch}
                isRequestingAccess={isRequestingAccess}
                requestLibraryAccess={requestLibraryAccess}
              />
            </TabsContent>

            <TabsContent value="requests" className="outline-none">
              <StudentRequestsTab
                pendingTutors={pendingTutors}
                rejectedTutors={rejectedTutors}
                isRequestingAccess={isRequestingAccess}
                requestLibraryAccess={requestLibraryAccess}
              />
            </TabsContent>
          </Tabs>
        )}

        {isTutor && (
          <>
            {(!isStudent || selectedTutorId) && (
              <>
                <ResourceFilters
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  activeFilter={activeFilter}
                  onFilterChange={setActiveFilter}
                />
              </>
            )}

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
                <p className="text-lg">No resources in your library yet.</p>
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
          </>
        )}
      </main>
    </div>
  );
};

export default ResourcePage;
