import { Link } from 'react-router-dom';
import Logo from './Logo';

const COLUMNS = [
  {
    title: 'Platform',
    links: [
      { to: '/report', label: 'Report a hazard' },
      { to: '/map', label: 'Road map' },
      { to: '/reports', label: 'All reports' },
      { to: '/dashboard', label: 'Authority dashboard' },
    ],
  },
  {
    title: 'Account',
    links: [
      { to: '/register', label: 'Create account' },
      { to: '/login', label: 'Sign in' },
      { to: '/profile', label: 'My reports' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="relative mt-24 overflow-hidden bg-night-950 text-white">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/60 to-transparent"
        aria-hidden="true"
      />
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo dark />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/55">
            A crowdsourced road hazard intelligence platform for Bangladesh. Ordinary smartphone photos
            become geospatial road-condition data that authorities can act on.
          </p>
          <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-white/60">
            <span className="h-1.5 w-1.5 rounded-full bg-sev-low" aria-hidden="true" />
            Coverage: Bangladesh
          </p>
        </div>

        {COLUMNS.map((column) => (
          <div key={column.title}>
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-white/40">
              {column.title}
            </p>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-white/70 transition-colors hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} DRISHTI AI · See the road. Detect the danger. Fix the future.</p>
          <p>
            Map data ©{' '}
            <a
              href="https://www.openstreetmap.org/copyright"
              className="hover:text-white"
              target="_blank"
              rel="noreferrer"
            >
              OpenStreetMap
            </a>{' '}
            contributors
          </p>
        </div>
      </div>
    </footer>
  );
}
