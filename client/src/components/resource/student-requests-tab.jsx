export function StudentRequestsTab({
  pendingTutors,
  rejectedTutors,
  isRequestingAccess,
  requestLibraryAccess,
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border p-4 md:p-6 bg-white">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Access Requests</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track the status of your library access requests to tutors.
          </p>
        </div>

        <div className="space-y-8">
          {/* Pending Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-semibold tracking-wide text-gray-900">
                Pending Requests ({pendingTutors.length})
              </h3>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                {pendingTutors.length}
              </span>
            </div>

            {pendingTutors.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-gray-50/50 py-8 text-center text-sm text-muted-foreground">
                You have no pending requests right now.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {pendingTutors.map((tutor) => (
                  <div
                    key={tutor._id}
                    className="flex flex-col gap-3 rounded-xl border p-4 bg-amber-50/30"
                  >
                    <div className="flex items-center justify-between min-w-0">
                      <div className="truncate">
                        <p className="font-semibold text-gray-900 truncate">{tutor.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{tutor.email}</p>
                      </div>
                      <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 whitespace-nowrap">
                        Pending
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="h-px bg-gray-200"></div>

          {/* Rejected/Revoked Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-semibold tracking-wide text-gray-900">
                Declined or Revoked ({rejectedTutors.length})
              </h3>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-xs font-bold text-rose-700">
                {rejectedTutors.length}
              </span>
            </div>

            {rejectedTutors.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-gray-50/50 py-8 text-center text-sm text-muted-foreground">
                No declined or revoked access requests.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {rejectedTutors.map((tutor) => (
                  <div
                    key={tutor._id}
                    className="flex flex-col gap-4 rounded-xl border p-4 bg-rose-50/30"
                  >
                    <div className="flex items-center justify-between min-w-0">
                      <div className="truncate">
                        <p className="font-semibold text-gray-900 truncate">{tutor.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{tutor.email}</p>
                      </div>
                      <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700 whitespace-nowrap truncate">
                        {tutor.accessStatus === 'revoked' ? 'Revoked' : 'Declined'}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={isRequestingAccess}
                      onClick={() => requestLibraryAccess(tutor._id)}
                      className="w-full flex items-center justify-center rounded-lg border-2 border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50"
                    >
                      Request Again
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
