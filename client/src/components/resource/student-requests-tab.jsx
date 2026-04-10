export function StudentRequestsTab({
  pendingTutors,
  rejectedTutors,
  isRequestingAccess,
  requestLibraryAccess,
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border-2 border-border p-4 md:p-6 bg-card text-card-foreground shadow-sm">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Access Requests</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track the status of your library access requests to tutors.
          </p>
        </div>

        <div className="space-y-8">
          {/* Pending Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-semibold tracking-wide text-foreground">
                Pending Requests ({pendingTutors.length})
              </h3>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-xs font-bold text-amber-600 dark:text-amber-400">
                {pendingTutors.length}
              </span>
            </div>

            {pendingTutors.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-border bg-muted/50 py-8 text-center text-sm text-muted-foreground">
                You have no pending requests right now.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {pendingTutors.map((tutor) => (
                  <div
                    key={tutor._id}
                    className="flex flex-col gap-3 rounded-xl border-2 border-border p-4 bg-amber-500/5 dark:bg-amber-500/10"
                  >
                    <div className="flex items-center justify-between min-w-0">
                      <div className="truncate">
                        <p className="font-semibold text-foreground truncate">{tutor.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{tutor.email}</p>
                      </div>
                      <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-600 dark:text-amber-400 whitespace-nowrap">
                        Pending
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="h-px bg-border"></div>

          {/* Rejected/Revoked Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-semibold tracking-wide text-foreground">
                Declined or Revoked ({rejectedTutors.length})
              </h3>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500/20 text-xs font-bold text-rose-600 dark:text-rose-400">
                {rejectedTutors.length}
              </span>
            </div>

            {rejectedTutors.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-border bg-muted/50 py-8 text-center text-sm text-muted-foreground">
                No declined or revoked access requests.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {rejectedTutors.map((tutor) => (
                  <div
                    key={tutor._id}
                    className="flex flex-col gap-4 rounded-xl border-2 border-border p-4 bg-rose-500/5 dark:bg-rose-500/10"
                  >
                    <div className="flex items-center justify-between min-w-0">
                      <div className="truncate">
                        <p className="font-semibold text-foreground truncate">{tutor.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{tutor.email}</p>
                      </div>
                      <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-rose-500/20 px-3 py-1 text-xs font-medium text-rose-600 dark:text-rose-400 whitespace-nowrap truncate">
                        {tutor.accessStatus === 'revoked' ? 'Revoked' : 'Declined'}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={isRequestingAccess}
                      onClick={() => requestLibraryAccess(tutor._id)}
                      className="w-full flex items-center justify-center rounded-lg border-2 border-input bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
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
