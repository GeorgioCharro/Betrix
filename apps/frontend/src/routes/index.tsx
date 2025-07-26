import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { SideMenu } from '@/components/SideMenu';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage(): JSX.Element {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = (): void => {
    setIsMenuOpen(open => !open);
  };

  return (
    <div className="flex min-h-screen">
      <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
      <div className="flex flex-1 flex-col">
        <Header />
        <Hero backgroundSrc="/banner/header-bg.png">
          <h1 className="text-3xl font-semibold text-neutral-default">
            Welcome to SimCasino
          </h1>
        </Hero>
      </div>
    </div>
  );
}
