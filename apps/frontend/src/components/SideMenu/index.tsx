import { AlignJustify } from 'lucide-react';
import * as React from 'react';

import { NAV_ITEMS } from '@/const/navigation';
import { useAuthStore } from '@/features/auth/store/authStore';
import { cn } from '@/lib/utils';

import SideMenuItem from './SideMenuItem';

export interface SideMenuProps {
  isOpen: boolean;
  onToggle: () => void;
}

const items = NAV_ITEMS;
const generalItems = items.filter(item => item.type === 'general');
const gameItems = items.filter(item => item.type === 'games');

export function SideMenu({ isOpen, onToggle }: SideMenuProps): JSX.Element {
  const { user, showLoginModal } = useAuthStore();

  const handleClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    path: string
  ): void => {
    if (
      (path === '/casino/my-bets' || path === '/casino/challenges') &&
      !user
    ) {
      e.preventDefault();
      showLoginModal();
      return;
    }
    onToggle();
  };

  return (
    <aside
      className={cn(
        'hidden h-screen flex-col overflow-hidden bg-brand-strong shadow-lg transition-all duration-300 md:flex',
        isOpen ? 'w-[150px]' : 'w-14'
      )}
    >
      <div className="bg-brand-stronger p-3 shadow-lg">
        <button onClick={onToggle} type="button">
          <AlignJustify className="h-4 w-6" />
        </button>
      </div>

      <nav className="mt-4 flex flex-col space-y-2 px-2">
        {generalItems.map(item => (
          <SideMenuItem
            isOpen={isOpen}
            item={item}
            key={item.path}
            onClick={handleClick}
          />
        ))}

        {gameItems.length > 0 && <hr className="my-2 border-brand-stronger" />}

        {gameItems.map(item => (
          <SideMenuItem
            isOpen={isOpen}
            item={item}
            key={item.path}
            onClick={handleClick}
          />
        ))}
      </nav>
    </aside>
  );
}
