import { Link } from '@tanstack/react-router';
import { AlignJustify } from 'lucide-react';
import { useMemo } from 'react';

import { NAV_ITEMS } from '@/const/navigation';
import { cn } from '@/lib/utils';

export interface SideMenuProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const items = NAV_ITEMS as NavItem[];

export function SideMenu({ isOpen, onToggle }: SideMenuProps): JSX.Element {
  const showNav = useMemo(
    () => isOpen && Array.isArray(items) && items.length > 0,
    [isOpen]
  );

  if (!showNav)
    return (
      <aside
        className={cn(
          'hidden h-screen flex-col bg-brand-strong shadow-lg transition-all duration-300 md:flex',
          isOpen ? 'w-56' : 'w-12'
        )}
      >
        <div className="bg-brand-stronger p-3 shadow-lg">
          <button onClick={onToggle} type="button">
            <AlignJustify className="h-4 w-6" />
          </button>
        </div>
      </aside>
    );

  return (
    <aside
      className={cn(
        'hidden h-screen flex-col bg-brand-strong shadow-lg transition-all duration-300 md:flex',
        isOpen ? 'w-56' : 'w-12'
      )}
    >
      <div className="bg-brand-stronger p-3 shadow-lg">
        <button onClick={onToggle} type="button">
          <AlignJustify className="h-4 w-6" />
        </button>
      </div>

      <nav className="mt-4 flex flex-col space-y-2 px-2">
        {items.map(item => (
          <Link
            className="flex items-center gap-2 rounded px-3 py-2 hover:bg-brand-weaker"
            key={item.path}
            onClick={onToggle}
            to={item.path}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
