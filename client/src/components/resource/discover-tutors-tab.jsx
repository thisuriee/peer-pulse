export function DiscoverTutorsTab({
  availableTutors,
  isLoadingTutorDirectory,
  tutorSearch,
  setTutorSearch,
  isRequestingAccess,
  requestLibraryAccess,
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border p-4 md:p-6 bg-white">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Discover Tutors</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Find tutors and request access to new learning resources.
            </p>
          </div>
          <input
            type="text"
            value={tutorSearch}
            onChange={(e) => setTutorSearch(e.target.value)}
            placeholder="Search by tutor name or email"
            className="h-10 rounded-md border px-3 text-sm md:w-80 shadow-sm focus:ring-1 focus:ring-primary focus:outline-none"
          />
        </div>

        {isLoadingTutorDirectory ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : availableTutors.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-gray-50/50 py-12 text-center">
            <p className="text-base font-medium">No new tutors found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try adjusting your search or wait for more tutors to join.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableTutors.map((tutor) => (
              <div
                key={tutor._id}
                className="flex flex-col gap-4 rounded-xl border p-5 transition-all hover:shadow-md bg-white"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-lg truncate text-gray-900">{tutor.name}</h3>
                  <p className="text-sm text-muted-foreground truncate">{tutor.email}</p>
                </div>

                <div className="flex-1 min-h-[4rem]">
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {tutor.bio || 'No bio provided by this tutor.'}
                  </p>
                </div>

                <div className="mt-auto pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    disabled={isRequestingAccess}
                    onClick={() => requestLibraryAccess(tutor._id)}
                    className="w-full flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
                  >
                    Request Access
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
