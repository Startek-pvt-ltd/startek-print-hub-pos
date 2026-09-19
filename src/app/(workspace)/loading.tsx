export default function WorkspaceLoading() {
  return (
    <div role="status" aria-live="polite" aria-label="Loading page" className="animate-pulse space-y-5">
      <div className="space-y-2">
        <div className="h-3 w-24 rounded-full bg-blue-100" />
        <div className="h-8 w-64 max-w-full rounded-lg bg-slate-200" />
        <div className="h-4 w-96 max-w-full rounded bg-slate-100" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-36 rounded-2xl border border-slate-200 bg-white shadow-sm" />
        ))}
      </div>
      <div className="h-72 rounded-2xl border border-slate-200 bg-white shadow-sm" />
      <span className="sr-only">Loading the latest POS data…</span>
    </div>
  );
}
