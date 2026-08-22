import { CheckCircle2, Clock, Loader2, AlertTriangle } from 'lucide-react';
import { STATUS_META, severityStyle } from '../utils/severity';

const ICONS = {
  pending: Clock,
  processing: Loader2,
  completed: CheckCircle2,
  failed: AlertTriangle,
};

/** Pipeline status of a report: queued / analysing / analysed / failed. */
export function StatusBadge({ status, className = '' }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  const Icon = ICONS[status] || Clock;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.chip} ${className}`}
    >
      <Icon className={`h-3.5 w-3.5 ${status === 'processing' ? 'animate-spin' : ''}`} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

/** Severity of a hazard: LOW / MODERATE / HIGH / CRITICAL. */
export function SeverityBadge({ label, score, className = '' }) {
  const style = severityStyle(label);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${style.chip} ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: style.hex }} aria-hidden="true" />
      {label}
      {Number.isFinite(score) && <span className="font-mono font-medium opacity-70">{score}</span>}
    </span>
  );
}

export function ResolutionBadge({ status, className = '' }) {
  const resolved = status === 'resolved';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
        resolved
          ? 'border-green-200 bg-green-50 text-green-800'
          : 'border-ink-line bg-zinc-50 text-ink-soft'
      } ${className}`}
    >
      {resolved ? 'Resolved' : 'Open'}
    </span>
  );
}

export default StatusBadge;
