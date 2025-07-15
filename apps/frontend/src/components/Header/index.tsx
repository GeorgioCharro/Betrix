import { Link } from '@tanstack/react-router';

import { logout } from '@/api/auth';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/features/auth/store/authStore';

import { Balance } from './Balance';

export function Header(): JSX.Element {
  const { user, setUser } = useAuthStore();

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

        {user ? (
          <div className="absolute left-1/2 -translate-x-1/2">
            <Balance />
          </div>
        ) : (
          <div className="absolute left-1/2 -translate-x-1/2" />
        )}

        {user ? (
          <Button onClick={() => void handleLogout()} variant="outline">
            Logout
          </Button>
        ) : (
          <Link to="/login">
            <Button variant="outline">Login</Button>
          </Link>
        )}
      </div>
    </header>
  );
}
