import { CheckCircle2 } from 'lucide-react';
import { useLang } from '../i18n';

const POINTS = ['auth.side.p1', 'auth.side.p2', 'auth.side.p3'];

/** Split-screen shell for sign-in and registration. */
export default function AuthLayout({ eyebrow, title, description, children, footer }) {
  const { t } = useLang();
  return (
    <div className="container-page py-10 sm:py-16">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl border border-ink-line bg-white shadow-lift lg:grid-cols-2">
        <aside className="relative hidden overflow-hidden bg-night-950 p-10 text-white lg:block">
          <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden="true" />
          <div
            className="pointer-events-none absolute -left-20 -top-20 h-80 w-80 rounded-full bg-brand-600/35 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-24 -right-10 h-64 w-64 rounded-full bg-magenta-500/20 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative flex h-full flex-col">
            <p className="font-bangla text-3xl text-brand-200">দৃষ্টি</p>
            <h2 className="mt-4 font-display text-3xl font-bold leading-tight">
              {t('auth.side.title1')}
              <br />
              <span className="text-gradient">{t('auth.side.title2')}</span>
            </h2>
            <ul className="mt-8 space-y-4">
              {POINTS.map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm text-white/70">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-300" aria-hidden="true" />
                  {t(point)}
                </li>
              ))}
            </ul>
            <p className="mt-auto pt-10 font-mono text-[11px] uppercase tracking-widest text-white/40">
              {t('auth.side.coverage')}
            </p>
          </div>
        </aside>

        <div className="p-7 sm:p-10">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">{title}</h1>
          {description && <p className="mt-2 text-sm text-ink-muted">{description}</p>}
          {children}
          {footer && <p className="mt-6 text-center text-sm text-ink-muted">{footer}</p>}
        </div>
      </div>
    </div>
  );
}
