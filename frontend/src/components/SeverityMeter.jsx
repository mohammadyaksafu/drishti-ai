import { severityStyle, SEVERITY_LEVELS } from '../utils/severity';

/**
 * The signature element of DRISHTI AI.
 *
 * A 0–100 severity score shown on a four-band scale, so the number is always
 * read in context: you see not just "87" but which band it lands in and how
 * far into that band it sits. Confidence is shown alongside but never mixed in,
 * because they answer different questions — "is it there" vs "how bad is it".
 */
export default function SeverityMeter({ score = 0, label = 'LOW', confidence = null, compact = false }) {
  const style = severityStyle(label);
  const clamped = Math.max(0, Math.min(100, Number(score) || 0));

  return (
    <div className="w-full">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Severity score</p>
          <p className="mt-1 flex items-baseline gap-1.5 font-display font-bold leading-none">
            <span className={compact ? 'text-4xl' : 'text-6xl'} style={{ color: style.hex }}>
              {clamped}
            </span>
            <span className="font-mono text-base font-medium text-ink-muted">/100</span>
          </p>
        </div>

        <div className="text-right">
          <span
            className="inline-block rounded-lg px-2.5 py-1 font-display text-sm font-bold uppercase tracking-wider text-white"
            style={{ backgroundColor: style.hex }}
          >
            {label}
          </span>
          {confidence !== null && Number.isFinite(confidence) && (
            <p className="mt-1.5 font-mono text-xs text-ink-muted">
              detector confidence {Math.round(confidence * 100)}%
            </p>
          )}
        </div>
      </div>

      {/* Four bands: 0-30, 31-60, 61-80, 81-100 */}
      <div className="mt-4" role="img" aria-label={`Severity ${clamped} out of 100, rated ${label}`}>
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-zinc-100">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out"
            style={{ width: `${clamped}%`, backgroundColor: style.hex }}
          />
          {[30, 60, 80].map((mark) => (
            <span
              key={mark}
              className="absolute inset-y-0 w-px bg-white/90"
              style={{ left: `${mark}%` }}
              aria-hidden="true"
            />
          ))}
        </div>
        <div className="mt-1.5 flex justify-between font-mono text-[10px] uppercase tracking-wider text-ink-muted">
          {SEVERITY_LEVELS.map((level) => (
            <span key={level} className={level === label ? 'font-bold text-ink' : ''}>
              {level}
            </span>
          ))}
        </div>
      </div>

      {!compact && <p className="mt-3 text-sm text-ink-soft">{style.blurb}</p>}
    </div>
  );
}
