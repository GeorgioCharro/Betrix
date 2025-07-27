import { createFileRoute, Navigate } from '@tanstack/react-router';
import { useEffect } from 'react';

import { useAuthStore } from '@/features/auth/store/authStore';

export const Route = createFileRoute('/_public/login')({
  component: LoginRedirect,
});

function LoginRedirect(): JSX.Element {
  const { showLoginModal } = useAuthStore();
  useEffect(() => {
    showLoginModal();
  }, [showLoginModal]);
  return <Navigate to="/" />;
}
