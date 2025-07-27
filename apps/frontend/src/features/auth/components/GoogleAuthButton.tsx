import { SiGoogle } from '@icons-pack/react-simple-icons';

import { Button, type ButtonProps } from '@/components/ui/button';
import { BASE_API_URL } from '@/const/routes';

interface GoogleAuthButtonProps extends Omit<ButtonProps, 'onClick'> {
  text?: string;
  redirectTo?: string;
}

export function GoogleAuthButton({
  text = 'Continue with Google',
  redirectTo,
  ...props
}: GoogleAuthButtonProps): JSX.Element {
  const handleGoogleLogin = (): void => {
    const redirect = redirectTo ?? window.location.href;
    localStorage.setItem('auth_redirect', redirect);
    window.location.href = `${BASE_API_URL}/api/v1/auth/google`;
  };

  return (
    <Button onClick={handleGoogleLogin} variant="outline" {...props}>
      <SiGoogle className="mr-2 h-4 w-4" />
      {text}
    </Button>
  );
}
