import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import * as React from 'react';

import { setupInterceptors } from '@/api/_utils/axiosInstance';
import { getUserDetails } from '@/api/auth';
import { LoginModal } from '@/features/auth/components/LoginModal';
import type { AuthState } from '@/features/auth/store/authStore';
import { useAuthStore } from '@/features/auth/store/authStore';

interface RouterContext {
  authStore: AuthState | undefined;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});

function RootLayout(): JSX.Element {
  const { user, setUser, showLoginModal } = useAuthStore();

  // Setup interceptors to show login modal on auth errors
  React.useEffect(() => {
    setupInterceptors({
      authErrCb: () => {
        setUser(null);
        showLoginModal();
      },
    });
  }, [setUser, showLoginModal]);

  React.useEffect(() => {
    if (!user) {
      getUserDetails()
        .then(res => {
          setUser(res.data);
        })
        .catch(() => {
          // Ignore errors, user might not be authenticated
        });
    }
  }, [user, setUser]);

  React.useEffect(() => {
    const redirectUrl = localStorage.getItem('auth_redirect');
    if (redirectUrl) {
      localStorage.removeItem('auth_redirect');
      window.location.href = redirectUrl;
    }
  }, []);

  return (
    <>
      <Outlet />
      <LoginModal />
      {import.meta.env.DEV ? <TanStackRouterDevtools /> : null}
    </>
  );
}
