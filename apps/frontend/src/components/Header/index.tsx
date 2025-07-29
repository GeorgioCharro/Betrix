import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import { logout } from '@/api/auth';
import { Button } from '@/components/ui/button';
import { RegisterModal } from '@/features/auth/components/RegisterModal';
import { useAuthStore } from '@/features/auth/store/authStore';

import { Balance } from './Balance';

export function Header(): JSX.Element {
  const { user, setUser, showLoginModal } = useAuthStore();
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const handleLogout = async (): Promise<void> => {
    try {
      await logout();
    } finally {
      setUser(null);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-brand-default px-4 shadow-lg">
      <div className="container relative mx-auto flex h-12 items-center justify-between">
        <Link to="/">
          <img
            alt="Betrix Logo"
            className="h-16 sm:h-18 md:h-20"
            src="/logo.png"
          />
        </Link>

        {/* Center Balance */}
        {user ? (
          <div className="absolute left-1/2 -translate-x-1/2">
            <Balance />
          </div>
        ) : (
          <div className="absolute left-1/2 -translate-x-1/2" />
        )}

        {/* Right-side buttons */}
        {user ? (
          <Button onClick={() => void handleLogout()} variant="outline">
            Logout
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={() => { setShowRegisterModal(true); }} variant="outline">
              Register
            </Button>
            <RegisterModal
              onOpenChange={setShowRegisterModal}
              open={showRegisterModal}
            />
            <Button onClick={showLoginModal} variant="outline">
              Login
            </Button>
            
          </div>
        )}
      </div>
    </header>
  );
}
