export default function StatCard({ label, value, hint, icon: Icon, accent = '#4c1d95', loading = false }) {
  return (
    <div className="card relative overflow-hidden p-5">
      <span
        className="absolute inset-x-0 top-0 h-0.5"
        style={{ background: `linear-gradient(90deg, ${accent}, ${accent}00)` }}
        aria-hidden="true"
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-ink-muted">{label}</p>
          {loading ? (
            <div className="skeleton mt-2 h-8 w-16" />
          ) : (
            <p className="mt-1.5 font-display text-3xl font-bold tabular-nums tracking-tight text-ink">{value}</p>
          )}
          {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
        </div>
        {Icon && (
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
            style={{ backgroundColor: `${accent}12`, color: accent, boxShadow: `inset 0 0 0 1px ${accent}22` }}
            aria-hidden="true"
          >
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
    </div>
  );
}
