import { zodResolver } from '@hookform/resolvers/zod';
import { SiGoogle } from '@icons-pack/react-simple-icons';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import type { RegisterSchema } from '@/common/schemas/registerSchema';
import { registerSchema } from '@/common/schemas/registerSchema';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BASE_API_URL } from '@/const/routes';

interface RegisterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RegisterModal({
  open,
  onOpenChange,
}: RegisterModalProps): JSX.Element {
  const [step, setStep] = useState(1);
  const totalSteps = 2;
  const [hasCode, setHasCode] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterSchema>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      username: '',
      password: '',
      dob: '',
      code: '',
    },
  });

  const handleGoogle = (): void => {
    window.location.href = `${BASE_API_URL}/api/v1/auth/google`;
  };

  const onSubmit = handleSubmit(() => {
    setStep(2);
  });

  const toggleCode = (val: boolean): void => {
    setHasCode(val);
    if (!val) setValue('code', '');
  };

  const progress = ((step - 1) / (totalSteps - 1)) * 100;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <div className="space-y-4">
          <div>
            <div className="mb-1 text-xs text-center">
              Step {step} of {totalSteps}
            </div>
            <div className="h-2 w-full rounded bg-secondary">
              <div
                className="h-2 rounded bg-primary"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          {step === 1 && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-center">
                  Create An Account
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-2 pt-2">
                <div className="space-y-1">
                  <Label htmlFor="reg-email">Email</Label>
                  <Input id="reg-email" type="email" {...register('email')} />
                  {errors.email ? (
                    <p className="text-xs text-destructive">
                      {errors.email.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="reg-username">UserName</Label>
                  <Input id="reg-username" {...register('username')} />
                  {errors.username ? (
                    <p className="text-xs text-destructive">
                      {errors.username.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="reg-password">Password</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    {...register('password')}
                  />
                  {errors.password ? (
                    <p className="text-xs text-destructive">
                      {errors.password.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="reg-dob">Date Of Birth</Label>
                  <Input id="reg-dob" type="date" {...register('dob')} />
                  {errors.dob ? (
                    <p className="text-xs text-destructive">
                      {errors.dob.message}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    checked={hasCode}
                    id="reg-hascode"
                    onCheckedChange={val => {
                      toggleCode(Boolean(val));
                    }}
                  />
                  <Label htmlFor="reg-hascode">Code</Label>
                </div>
                {hasCode ? (
                  <div className="space-y-1">
                    <Label htmlFor="reg-code">Code</Label>
                    <Input id="reg-code" {...register('code')} />
                    {errors.code ? (
                      <p className="text-xs text-destructive">
                        {errors.code.message}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <Button className="mt-4 w-full" onClick={() => void onSubmit()}>
                Continue
              </Button>
              <Button
                className="w-full"
                onClick={handleGoogle}
                variant="outline"
              >
                <SiGoogle className="mr-2 h-4 w-4" />
                Continue with Google
              </Button>
            </>
          )}
          {step === 2 && (
            <div className="py-6 text-center space-y-4">
              <p className="text-lg">Registration Complete!</p>
              <Button
                className="w-full"
                onClick={() => {
                  onOpenChange(false);
                }}
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
