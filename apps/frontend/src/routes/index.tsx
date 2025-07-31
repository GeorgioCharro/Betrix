import { createFileRoute } from '@tanstack/react-router';
import { Club } from 'lucide-react';
import { useState } from 'react';

import { Footer2 } from '@/components/footer2';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { SearchGames } from '@/components/SearchGames';
import { SideMenu } from '@/components/SideMenu';
import { StartPlayingPromo } from '@/components/StartPlayingPromo';
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
    <>
      <div className="flex min-h-screen">
        <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
        <div className="flex flex-1 flex-col">
          <Header />
          <Hero backgroundSrc="/banner/header-bg.png">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-col items-center gap-4 sm:items-start">
                {user ? (
                  <div className="flex justify-center sm:justify-start">
                    <VipCard user={user} />
                  </div>
                ) : (
                  <>
                    <h1 className="text-center text-3xl font-semibold text-neutral-default sm:text-left">
                      Welcome to Betrix
                    </h1>
                    <div className="flex w-full flex-col items-center space-y-2 sm:w-64 sm:items-start">
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
              <div className="hidden justify-center sm:block w-full sm:w-auto">
                <PromoCard
                  className="w-80 shrink-0"
                  icon={Club}
                  imageSrc="/banner/casino.png"
                  navigateTo="/casino"
                  title="Casino"
                />
              </div>
            </div>
          </Hero>
          <StartPlayingPromo />
          <div className="container py-6">
            <SearchGames />
          </div>
          <FeaturedGames />
          <CasinoBets />
          <Faq />
        </div>
      </div>
      <Footer2 />
    </>
  );
}
