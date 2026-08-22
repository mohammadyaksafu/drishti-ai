import { HAZARD_META } from '../utils/severity';

/** One of the six classes the detector is trained to recognise. */
export default function HazardCard({ type, icon: Icon, count = null }) {
  const meta = HAZARD_META[type] || { name: type, description: '' };
  return (
    <div className="card p-5 transition-shadow hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-800">
          {Icon ? <Icon className="h-5 w-5" aria-hidden="true" /> : null}
        </span>
        {count !== null && (
          <span className="font-mono text-xs text-ink-muted">
            {count} reported
          </span>
        )}
      </div>
      <h3 className="mt-4 font-display text-base font-bold text-ink">{meta.name}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{meta.description}</p>
    </div>
  );
}
