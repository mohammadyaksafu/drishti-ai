import { Link } from 'react-router-dom';
import Logo from './Logo';
import { useLang } from '../i18n';

const COLUMNS = [
  {
    title: 'foot.platform',
    links: [
      { to: '/report', label: 'foot.report' },
      { to: '/map', label: 'foot.map' },
      { to: '/reports', label: 'foot.reports' },
      { to: '/dashboard', label: 'foot.dashboard' },
    ],
  },
  {
    title: 'foot.account',
    links: [
      { to: '/register', label: 'foot.register' },
      { to: '/login', label: 'foot.login' },
      { to: '/profile', label: 'foot.profile' },
    ],
  },
];

/** A small Bangladesh flag: bottle green field, red disc set toward the hoist. */
export function FlagBD({ className = 'h-3.5 w-6' }) {
  return (
    <svg viewBox="0 0 20 12" className={`${className} rounded-[2px]`} aria-hidden="true">
      <rect width="20" height="12" fill="#006a4e" />
      <circle cx="9" cy="6" r="4" fill="#f42a41" />
    </svg>
  );
}

export default function Footer() {
  const { t, num } = useLang();
  return (
    <footer className="relative mt-24 overflow-hidden bg-night-950 text-white">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/60 to-transparent"
        aria-hidden="true"
      />
      {/* The red sun, rising behind the footer. */}
      <div
        className="pointer-events-none absolute -bottom-40 right-[8%] h-80 w-80 rounded-full bg-magenta-500/15 blur-3xl"
        aria-hidden="true"
      />
      <div className="container-page relative grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo dark />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/55">{t('foot.about')}</p>
          <p className="mt-5 font-bangla text-3xl text-magenta-400" lang="bn">সবার আগে বাংলাদেশ</p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
            <FlagBD className="h-3 w-5" />
            {t('foot.coverage')}
          </p>
        </div>

        {COLUMNS.map((column) => (
          <div key={column.title}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/40">{t(column.title)}</p>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-white/70 transition-colors hover:text-white">
                    {t(link.label)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="relative border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {num(new Date().getFullYear())} DRISHTI AI · {t('foot.tagline')}
          </p>
          <p>
            {t('foot.mapData')}{' '}
            <a href="https://www.openstreetmap.org/copyright" className="hover:text-white" target="_blank" rel="noreferrer">
              OpenStreetMap
            </a>{' '}
            {t('foot.contributors')}
          </p>
        </div>
      </div>
    </footer>
  );
}
