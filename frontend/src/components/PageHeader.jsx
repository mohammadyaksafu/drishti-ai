/**
 * The dark band that opens every interior page. It carries the page's role
 * (eyebrow), its title, an optional summary and an optional action slot, so
 * every screen in the product starts the same way.
 */
export default function PageHeader({ eyebrow, title, description, actions, children }) {
  return (
    <section className="relative overflow-hidden bg-night-950 text-white">
      <div className="bg-grid mask-fade-b pointer-events-none absolute inset-0" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-brand-600/30 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 left-1/4 h-72 w-72 rounded-full bg-magenta-500/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="container-page relative flex flex-wrap items-end justify-between gap-6 pb-12 pt-10 sm:pb-14 sm:pt-14">
        <div className="min-w-0 max-w-3xl animate-fade-up">
          {eyebrow && (
            <p className="eyebrow-light">
              <span className="h-1.5 w-1.5 rounded-full bg-magenta-400" aria-hidden="true" />
              {eyebrow}
            </p>
          )}
          <h1 className="mt-3 break-words font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          {description && <div className="mt-3 max-w-2xl text-base leading-relaxed text-white/65">{description}</div>}
          {children}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </section>
  );
}
