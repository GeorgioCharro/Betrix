import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import { Header } from '@/components/Header';
import { SideMenu } from '@/components/SideMenu';
import ProvablyFairCalculation from '@/features/provaly-fair/ProvablyFairCalculation';

export const Route = createFileRoute('/_public/provably-fair/calculation')({
  component: ProvablyFairCalculationPage,
});

function ProvablyFairCalculationPage(): JSX.Element {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = (): void => {
    setIsMenuOpen(open => !open);
  };

  return (
    <div className="flex min-h-screen">
      <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
      <div className="flex flex-1 flex-col">
        <Header />
        <ProvablyFairCalculation />
      </div>
    </div>
  );
}
