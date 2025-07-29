import { createFileRoute } from '@tanstack/react-router';
import { Club } from 'lucide-react';
import { useState } from 'react';
import { Footer } from 'react-day-picker';

import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { SearchGames } from '@/components/SearchGames';
import { SideMenu } from '@/components/SideMenu';
import { Button } from '@/components/ui/button';
import { PromoCard } from '@/components/ui/promo-card';
import { GoogleAuthButton } from '@/features/auth/components/GoogleAuthButton';
import { RegisterModal } from '@/features/auth/components/RegisterModal';
import { useAuthStore } from '@/features/auth/store/authStore';
import CasinoBets from '@/features/casino-bets';
import { Faq } from '@/features/home/components/Faq';
import { FeaturedGames } from '@/features/home/components/FeaturedGames';
import { VipCard } from '@/features/home/components/VipCard';

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
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-4">
                           {user ? (
                <VipCard progress={50} user={user} />
              ) : (
                <>
                  <h1 className="text-3xl font-semibold text-neutral-default">
                    Welcome to SimCasino
                  </h1>
                  <div className="flex w-64 flex-col items-start space-y-2">
                    <Button
                      className="w-full"
                      onClick={() => {
                        setShowRegister(true);
                      }}
                    >
                      Register
                    </Button>
                    <GoogleAuthButton className="w-full" type="button" />
                    <RegisterModal
                      onOpenChange={setShowRegister}
                      open={showRegister}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Promo Card */}
            <div className="flex justify-center sm:block w-full sm:w-auto">
              <PromoCard
                className="w-80 shrink-0"
                icon={Club}
                imageSrc="/banner/casino.png"
                navigateTo='/casino'
                title="Casino"
              />
            </div>
          </div>
        </Hero>

        <div className="container py-6">
          <SearchGames />
        </div>
        <div className="container py-6">
          <FeaturedGames />
        </div>
        <CasinoBets />
        <Faq />
        <Footer />
        
      </div>
    </div>
  );
}
