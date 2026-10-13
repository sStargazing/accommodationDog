export function ListingFormSkeleton() {
  return (
    <div className="grid gap-8" aria-busy="true" aria-label="Loading form">
      <div className="h-12 rounded-lg bg-muted" />
      <div className="grid gap-3">
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="h-8 w-2/3 rounded bg-muted" />
      </div>
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="grid gap-2">
          <div className="h-4 w-28 rounded bg-muted" />
          <div className="h-11 rounded-lg bg-muted" />
        </div>
      ))}
    </div>
  );
}
