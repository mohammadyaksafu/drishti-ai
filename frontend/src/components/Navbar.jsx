import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu, X, LogOut, LayoutDashboard, Shield, Camera, FileText, Map as MapIcon, BarChart3, Languages,
} from 'lucide-react';
import { useLang } from '../i18n';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

const LINKS = [
  { to: '/reports', label: 'nav.reports', icon: FileText },
  { to: '/map', label: 'nav.map', icon: MapIcon },
  { to: '/dashboard', label: 'nav.dashboard', icon: BarChart3 },
];

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { t, lang, toggle } = useLang();

  const langButton = () => (
    <button
      type="button"
      onClick={toggle}
      className="btn gap-1.5 border border-white/10 px-2.5 py-1.5 text-white/80 hover:border-white/25 hover:bg-white/5 hover:text-white"
      title={t('nav.switchLang')}
      aria-label={t('nav.switchLang')}
    >
      <Languages className="h-4 w-4" aria-hidden="true" />
      <span className="text-xs font-semibold">{lang === 'bn' ? 'EN' : 'বাংলা'}</span>
    </button>
  );
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Close the mobile menu whenever the route changes.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(window.scrollY / max, 1) : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const signOut = () => {
    logout();
    setOpen(false);
    navigate('/');
  };

  const linkClass = ({ isActive }) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
      isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
    }`;

  const mobileLinkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
      isActive ? 'bg-white/10 text-white' : 'text-white/70'
    }`;

  const showFab = !['/report', '/login', '/register'].includes(pathname) && !open;

  return (
    <>
    <header
      className={`sticky top-0 z-[1000] border-b transition-colors duration-300 ${
        scrolled || open ? 'border-white/10 bg-night-950/90 backdrop-blur-xl' : 'border-transparent bg-night-950'
      }`}
    >
      <nav className="container-page flex h-16 items-center justify-between gap-4" aria-label="Main">
        <Logo dark />

        <div className="hidden items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1 md:flex">
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} className={linkClass}>
              {t(link.label)}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink to="/admin" className={linkClass}>
              {t('nav.admin')}
            </NavLink>
          )}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {langButton()}
          {isAuthenticated ? (
            <>
              <Link
                to="/profile"
                className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white"
                title={t('nav.account')}
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-500/25 font-mono text-[11px] font-bold text-brand-200 ring-1 ring-brand-400/40">
                  {initials(user.name)}
                </span>
                <span className="max-w-[8rem] truncate">{user.name.split(' ')[0]}</span>
              </Link>
              <button
                type="button"
                onClick={signOut}
                className="btn px-2.5 text-white/60 hover:bg-white/5 hover:text-white"
                aria-label={t('nav.signOut')}
                title={t('nav.signOut')}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
              <Link to="/report" className="btn-primary">
                <Camera className="h-4 w-4" aria-hidden="true" />
                {t('nav.reportHazard')}
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="btn text-white/75 hover:bg-white/5 hover:text-white">
                {t('nav.signIn')}
              </Link>
              <Link to="/register" className="btn-light">
                {t('nav.createAccount')}
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 md:hidden">
        {langButton()}
        <button
          type="button"
          className="btn px-2.5 text-white hover:bg-white/10"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        </div>
      </nav>

      {open && (
        <div className="animate-fade-up border-t border-white/10 md:hidden">
          <div className="container-page space-y-1 py-3">
            {LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} className={mobileLinkClass}>
                <link.icon className="h-4 w-4" aria-hidden="true" />
                {t(link.label)}
              </NavLink>
            ))}

            {isAdmin && (
              <NavLink to="/admin" className={mobileLinkClass}>
                <Shield className="h-4 w-4" aria-hidden="true" />
                {t('nav.adminPanel')}
              </NavLink>
            )}

            <div className="space-y-2 border-t border-white/10 pt-3">
              {isAuthenticated ? (
                <>
                  <Link to="/report" className="btn-primary w-full">
                    <Camera className="h-4 w-4" aria-hidden="true" />
                    {t('nav.reportHazard')}
                  </Link>
                  <Link to="/profile" className="btn-outline-light w-full">
                    <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                    {t('nav.myReports')}
                  </Link>
                  <button type="button" onClick={signOut} className="btn w-full text-white/70 hover:bg-white/5">
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    {t('nav.signOut')}
                  </button>
                </>
              ) : (
                <>
                  <Link to="/register" className="btn-light w-full">
                    {t('nav.createAccount')}
                  </Link>
                  <Link to="/login" className="btn-outline-light w-full">
                    {t('nav.signIn')}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reading progress */}
      <span
        className="absolute bottom-0 left-0 h-[2px] origin-left bg-gradient-to-r from-brand-500 to-magenta-400 transition-transform duration-150"
        style={{ width: '100%', transform: `scaleX(${progress})` }}
        aria-hidden="true"
      />
    </header>

    {/* On phones the main action is always one thumb-tap away. */}
    {showFab && (
      <Link
        to="/report"
        className="fab-in fixed bottom-5 right-5 z-[950] flex items-center gap-2 rounded-full bg-brand-gradient px-5 py-3.5 text-sm font-semibold text-white shadow-glow md:hidden"
      >
        <Camera className="h-5 w-5" aria-hidden="true" />
        {t('nav.reportHazard')}
      </Link>
    )}
    </>
  );
}
