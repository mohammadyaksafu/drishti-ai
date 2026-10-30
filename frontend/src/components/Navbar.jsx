import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu, X, LogOut, LayoutDashboard, Shield, Camera, FileText, Map as MapIcon, BarChart3,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

const LINKS = [
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/map', label: 'Road map', icon: MapIcon },
  { to: '/dashboard', label: 'Dashboard', icon: BarChart3 },
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
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Close the mobile menu whenever the route changes.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
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

  return (
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
              {link.label}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink to="/admin" className={linkClass}>
              Admin
            </NavLink>
          )}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {isAuthenticated ? (
            <>
              <Link
                to="/profile"
                className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white"
                title="Your account"
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
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
              <Link to="/report" className="btn-primary">
                <Camera className="h-4 w-4" aria-hidden="true" />
                Report hazard
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="btn text-white/75 hover:bg-white/5 hover:text-white">
                Sign in
              </Link>
              <Link to="/register" className="btn-light">
                Create account
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="btn px-2.5 text-white hover:bg-white/10 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="animate-fade-up border-t border-white/10 md:hidden">
          <div className="container-page space-y-1 py-3">
            {LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} className={mobileLinkClass}>
                <link.icon className="h-4 w-4" aria-hidden="true" />
                {link.label}
              </NavLink>
            ))}

            {isAdmin && (
              <NavLink to="/admin" className={mobileLinkClass}>
                <Shield className="h-4 w-4" aria-hidden="true" />
                Admin panel
              </NavLink>
            )}

            <div className="space-y-2 border-t border-white/10 pt-3">
              {isAuthenticated ? (
                <>
                  <Link to="/report" className="btn-primary w-full">
                    <Camera className="h-4 w-4" aria-hidden="true" />
                    Report hazard
                  </Link>
                  <Link to="/profile" className="btn-outline-light w-full">
                    <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                    My reports
                  </Link>
                  <button type="button" onClick={signOut} className="btn w-full text-white/70 hover:bg-white/5">
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/register" className="btn-light w-full">
                    Create account
                  </Link>
                  <Link to="/login" className="btn-outline-light w-full">
                    Sign in
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
