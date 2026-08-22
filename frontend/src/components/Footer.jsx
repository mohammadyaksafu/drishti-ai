import { Link } from 'react-router-dom';

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
    <footer className="mt-20 border-t border-ink-line bg-white">
      <div className="container-page grid gap-10 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="font-display text-lg font-bold text-ink">
            DRISHTI<span className="text-brand-700"> AI</span>
          </p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-muted">
            A crowdsourced road hazard intelligence platform for Bangladesh. Ordinary smartphone photos
            become geospatial road-condition data that authorities can act on.
          </p>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-widest text-ink-muted">
            Coverage: Bangladesh
          </p>
        </div>

        {COLUMNS.map((column) => (
          <div key={column.title}>
            <p className="font-display text-sm font-bold text-ink">{column.title}</p>
            <ul className="mt-3 space-y-2">
              {column.links.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-ink-muted hover:text-brand-800">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-ink-line">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} DRISHTI AI · Prototype build</p>
          <p>
            Map data ©{' '}
            <a
              href="https://www.openstreetmap.org/copyright"
              className="hover:text-brand-800"
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
