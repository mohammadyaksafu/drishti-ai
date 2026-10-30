import { Link } from 'react-router-dom';

/**
 * Empty screens are an invitation to act, so every one of these carries a
 * next step rather than just an apology.
 */
export default function EmptyState({ icon: Icon, title, description, actionLabel, actionTo, onAction }) {
  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-ink-line bg-white px-6 py-16 text-center">
      <div className="bg-grid-light mask-fade-b pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />
      {Icon && (
        <span className="relative mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
      )}
      <h3 className="relative font-display text-lg font-semibold text-ink">{title}</h3>
      {description && <p className="relative mt-1.5 max-w-md text-sm text-ink-muted">{description}</p>}

      {actionLabel && actionTo && (
        <Link to={actionTo} className="btn-primary relative mt-6">
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && !actionTo && (
        <button type="button" onClick={onAction} className="btn-primary relative mt-6">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
