import { MatchRoute, Outlet, createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import { Header } from '@/components/Header';
import { SideMenu } from '@/components/SideMenu';
import ProvablyFair from '@/features/provaly-fair';

export const Route = createFileRoute('/_public/provably-fair')({
  component: ProvablyFairLayout,
});

function ProvablyFairLayout(): JSX.Element {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = (): void => {
    setIsMenuOpen(open => !open);
  };

  return (
    <div className="flex min-h-screen">
      <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
      <div className="flex flex-1 flex-col">
        <Header />
        <MatchRoute to="/provably-fair">
          <ProvablyFair />
        </MatchRoute>
        <Outlet />
      </div>
    </div>
  );
}
