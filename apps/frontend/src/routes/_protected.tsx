import { QueryClient } from '@tanstack/react-query';
import { createFileRoute, Outlet } from '@tanstack/react-router';
import { useState } from 'react';

import { getUserDetails } from '@/api/auth';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Header } from '@/components/Header';
import { SideMenu } from '@/components/SideMenu';
import { getAuthState } from '@/features/auth/store/authStore';

export const Route = createFileRoute('/_protected')({
  async beforeLoad({ context }) {
    const { user, showLoginModal } = getAuthState();

    if (!user) {
      try {
        // Fetch user details if not already authenticated
        const queryClient = new QueryClient();
        const res = await queryClient.fetchQuery({
          queryKey: ['me'],
          queryFn: getUserDetails,
          retry: false,
        });
        // Set user in auth store if fetch succeeds
        context.authStore?.setUser(res.data);
      } catch (error) {
        // Instead of redirecting, show login modal
        showLoginModal();
      }
    }
  },
  component: ProtectedLayout,
});

function ProtectedLayout(): JSX.Element {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = (): void => {
    setIsMenuOpen(open => !open);
  };

  return (
    <div className="flex min-h-screen">
      <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
      <div className="flex flex-1 flex-col">
        <Header />
        <Outlet />
      </div>
      <BottomNavigation />
    </div>
  );
}
