import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { SideMenu } from '@/components/SideMenu';
import { Button } from '@/components/ui/button';
import { RegisterModal } from '@/features/auth/components/RegisterModal';
import { useAuthStore } from '@/features/auth/store/authStore';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage(): JSX.Element {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const { user } = useAuthStore();
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
          {!user && (
            <div className="mt-4">
              <Button
                onClick={() => {
                  setShowRegister(true);
                }}
              >
                Register
              </Button>
              <RegisterModal
                onOpenChange={setShowRegister}
                open={showRegister}
              />
            </div>
          )}{' '}
          --\
        </Hero>
      </div>
    </div>
  );
}
