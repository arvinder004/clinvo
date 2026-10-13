import { useLocation } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

const routeLabels: Record<string, string> = {
  '/licenses': 'Licenses',
  '/licenses/new': 'Issue New License',
  '/plans': 'Plans',
  '/tenants': 'Tenants',
};

export function TopBar() {
  const location = useLocation();
  const [dark, setDark] = useState(() => localStorage.getItem('clinvo_theme') === 'dark');

  const title =
    routeLabels[location.pathname] ||
    (location.pathname.startsWith('/licenses/') ? 'License Detail' : 'Dashboard');

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('clinvo_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('clinvo_theme', 'light');
    }
  }, [dark]);

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <h1 className="text-base font-semibold">{title}</h1>
      <Button
        id="btn-toggle-dark-mode"
        variant="ghost"
        size="icon"
        onClick={() => setDark((d) => !d)}
        aria-label="Toggle dark mode"
      >
        {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
    </header>
  );
}
