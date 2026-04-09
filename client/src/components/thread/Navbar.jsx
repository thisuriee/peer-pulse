import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { PeerPulseLogoMark } from "../peer-pulse-logo";
import { ThemeToggle } from "../theme-toggle";
import { Bell, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

function initials(name = '') {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function Avatar({ name, size = 'md' }) {
  const sz =
    size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-11 h-11 text-base' : 'w-9 h-9 text-sm';
  return (
    <div
      className={`${sz} rounded-full bg-primary/15 text-primary font-semibold flex items-center justify-center shrink-0`}
    >
      {initials(name)}
    </div>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinks = [
    { label: 'Home', href: '/home' },
    { label: 'Sessions', href: '/sessions' },
    { label: 'Resources', href: '/resources' },
    { label: 'Community', href: '/threads' },
    { label: 'Tutors', href: '/tutors' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b-2 border-border bg-background/90 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/home" className="flex items-center gap-2.5 shrink-0 group">
          <PeerPulseLogoMark
            size={36}
            className="shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 drop-shadow-[3px_4px_0_rgba(0,0,0,0.12)] dark:drop-shadow-[4px_5px_0_rgba(0,0,0,0.45)]"
          />
          <span className="text-base font-display font-extrabold tracking-tight uppercase">
            PeerPulse
          </span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(({ label, href }) => {
            const active = location.pathname.startsWith(href);
            return (
              <Link
                key={label}
                to={href}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                  active
                    ? 'text-primary bg-primary/10 border-2 border-primary/25'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent border-2 border-transparent'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle className="hover:bg-accent hover:text-foreground transition-colors" />
          <button className="w-9 h-9 flex items-center justify-center rounded-full border-2 border-transparent text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <Bell className="w-4 h-4" />
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-2 rounded-full px-2 py-1 border-2 border-transparent hover:border-border hover:bg-accent transition-colors"
            >
              <Avatar name={user?.name ?? 'User'} size="sm" />
              <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate">
                {user?.name ?? 'Loading...'}
              </span>
            </button>

            {open && (
              <div className="absolute right-0 top-full mt-1 w-52 rounded-2xl border-2 border-border bg-background shadow-lg py-1 z-50 overflow-hidden pp-brutal-shadow">
                <div className="px-3 py-2 border-b border-border mb-1">
                  <p className="text-sm font-semibold truncate">{user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20 capitalize">
                    {user?.role}
                  </span>
                </div>
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
