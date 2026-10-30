import { HAZARD_META } from '../utils/severity';

/** One of the six classes the detector is trained to recognise. */
export default function HazardCard({ type, icon: Icon, count = null }) {
  const meta = HAZARD_META[type] || { name: type, description: '' };
  return (
    <div className="card card-hover group p-6">
      <div className="flex items-start justify-between gap-3">
        <span className="icon-tile h-11 w-11 transition-colors group-hover:bg-brand-600 group-hover:text-white group-hover:ring-brand-600">
          {Icon ? <Icon className="h-5 w-5" aria-hidden="true" /> : null}
        </span>
        {count !== null && (
          <span className="rounded-full bg-canvas px-2.5 py-1 font-mono text-[11px] text-ink-muted ring-1 ring-inset ring-ink-line">
            {count} reported
          </span>
        )}
      </div>
      <h3 className="mt-5 font-display text-lg font-bold text-ink">{meta.name}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{meta.description}</p>
    </div>
  );
}
