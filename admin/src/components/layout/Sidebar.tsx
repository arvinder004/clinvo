import { NavLink, useNavigate } from 'react-router-dom';
import { KeyRound, LayoutDashboard, Users, Package, LogOut } from 'lucide-react';
import { clearToken } from '@/lib/auth';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/licenses', label: 'Licenses', icon: KeyRound },
  { to: '/plans', label: 'Plans', icon: Package },
  { to: '/tenants', label: 'Tenants', icon: Users },
];

export function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearToken();
    navigate('/login');
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-10 flex w-60 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold tracking-tight">Clinvo</span>
          <span className="rounded bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground">Admin</span>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-auto py-4">
        <ul className="space-y-1 px-3">
          {navItems.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                id={`nav-${label.toLowerCase()}`}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout */}
      <div className="border-t p-3">
        <button
          id="btn-logout"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
