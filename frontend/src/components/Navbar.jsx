import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, LayoutDashboard, Shield, UserRound, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LINKS = [
  { to: '/reports', label: 'Reports' },
  { to: '/map', label: 'Road map' },
  { to: '/dashboard', label: 'Dashboard' },
];

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="DRISHTI AI home">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-900">
        <span className="grid h-4 w-4 place-items-center rounded-full border-2 border-brand-300">
          <span className="h-1.5 w-1.5 rounded-full bg-magenta-500" />
        </span>
      </span>
      <span className="font-display text-lg font-bold tracking-tight text-ink">
        DRISHTI<span className="text-brand-700"> AI</span>
      </span>
    </Link>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const signOut = () => {
    logout();
    setOpen(false);
    navigate('/');
  };

  const linkClass = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive ? 'bg-brand-50 text-brand-900' : 'text-ink-soft hover:bg-zinc-100 hover:text-ink'
    }`;

  return (
    <header className="sticky top-0 z-[1000] border-b border-ink-line bg-white/85 backdrop-blur">
      <nav className="container-page flex h-16 items-center justify-between gap-4" aria-label="Main">
        <Logo />

        <div className="hidden items-center gap-1 md:flex">
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
              <Link to="/profile" className="btn-ghost" title="Your account">
                <UserRound className="h-4 w-4" aria-hidden="true" />
                <span className="max-w-[8rem] truncate">{user.name.split(' ')[0]}</span>
              </Link>
              <button type="button" onClick={signOut} className="btn-ghost" aria-label="Sign out">
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
              <Link to="/report" className="btn-primary">
                <Camera className="h-4 w-4" aria-hidden="true" />
                Report hazard
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost">
                Sign in
              </Link>
              <Link to="/register" className="btn-primary">
                Create account
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="btn-ghost md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-ink-line bg-white md:hidden">
          <div className="container-page space-y-1 py-3">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `block rounded-lg px-3 py-2.5 text-sm font-medium ${
                    isActive ? 'bg-brand-50 text-brand-900' : 'text-ink-soft'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}

            {isAdmin && (
              <NavLink
                to="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-soft"
              >
                <Shield className="h-4 w-4" aria-hidden="true" />
                Admin panel
              </NavLink>
            )}

            <div className="space-y-2 border-t border-ink-line pt-3">
              {isAuthenticated ? (
                <>
                  <Link to="/report" onClick={() => setOpen(false)} className="btn-primary w-full">
                    <Camera className="h-4 w-4" aria-hidden="true" />
                    Report hazard
                  </Link>
                  <Link to="/profile" onClick={() => setOpen(false)} className="btn-secondary w-full">
                    <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                    My reports
                  </Link>
                  <button type="button" onClick={signOut} className="btn-ghost w-full">
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/register" onClick={() => setOpen(false)} className="btn-primary w-full">
                    Create account
                  </Link>
                  <Link to="/login" onClick={() => setOpen(false)} className="btn-secondary w-full">
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
