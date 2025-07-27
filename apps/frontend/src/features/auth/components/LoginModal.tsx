import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { loginAccount, getUserDetails } from '@/api/auth';
import { loginSchema, type LoginSchema } from '@/common/schemas/loginSchema';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { GoogleAuthButton } from './GoogleAuthButton';
import { useAuthStore } from '../store/authStore';

export function LoginModal(): JSX.Element {
  const { user, isModalOpen, hideLoginModal, setUser } = useAuthStore();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
  });

  // Close the modal when user becomes authenticated
  useEffect(() => {
    if (user) {
      hideLoginModal();
    }
  }, [user, hideLoginModal]);

  const onSubmit = handleSubmit(async data => {
    try {
      await loginAccount({
        identifier: data.identifier,
        password: data.password,
      });
      const res = await getUserDetails();
      setUser(res.data);
      hideLoginModal();
    } catch (err) {
      let message = 'Login failed';
      if (axios.isAxiosError<{ message?: string }>(err)) {
        const serverMsg = err.response?.data.message;
        if (typeof serverMsg === 'string') {
          message = serverMsg;
        }
      } else if (err instanceof Error) {
        message = err.message;
      }
      setError('identifier', { type: 'server', message });
    }
  });
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    void onSubmit(e);
  };

  return (
    <Dialog onOpenChange={hideLoginModal} open={isModalOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Welcome to Fake Stake
          </DialogTitle>
        </DialogHeader>

        <form
          className="flex flex-col space-y-4 pt-4"
          onSubmit={handleFormSubmit}
        >
          <div className="space-y-1">
            <Label htmlFor="login-id">Email or Username</Label>
            <Input id="login-id" {...register('identifier')} />
            {errors.identifier ? (
              <p className="text-xs text-destructive">
                {errors.identifier.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label htmlFor="login-password">Password</Label>
            <Input
              id="login-password"
              type="password"
              {...register('password')}
            />
            {errors.password ? (
              <p className="text-xs text-destructive">
                {errors.password.message}
              </p>
            ) : null}
          </div>
          <Button className="w-full" disabled={isSubmitting} type="submit">
            Sign In
          </Button>
          <GoogleAuthButton
            className="w-full py-4 text-base font-medium"
            type="button"
          />

          <p className="text-center text-xs text-muted-foreground">
            By continuing, you agree to our{' '}
            <Button className="p-0 h-auto font-normal text-xs" variant="link">
              Terms of Service
            </Button>{' '}
            and{' '}
            <Button className="p-0 h-auto font-normal text-xs" variant="link">
              Privacy Policy
            </Button>
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
