export default function StatCard({ label, value, hint, icon: Icon, accent = '#4c1d95', loading = false }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-muted">{label}</p>
          {loading ? (
            <div className="skeleton mt-2 h-8 w-16" />
          ) : (
            <p className="mt-1 font-display text-3xl font-bold tabular-nums text-ink">{value}</p>
          )}
          {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
        </div>
        {Icon && (
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
            style={{ backgroundColor: `${accent}14`, color: accent }}
            aria-hidden="true"
          >
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
    </div>
  );
}
