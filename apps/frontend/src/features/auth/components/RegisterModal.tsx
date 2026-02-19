import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { registerAccount } from '@/api/auth';
import type { RegisterSchema } from '@/common/schemas/registerSchema';
import { registerSchema } from '@/common/schemas/registerSchema';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { GoogleAuthButton } from './GoogleAuthButton';

interface ErrorResponse {
  message: string;
}

function isErrorResponse(data: unknown): data is ErrorResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as Record<string, unknown>).message === 'string'
  );
}

interface RegisterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RegisterModal({
  open,
  onOpenChange,
}: RegisterModalProps): JSX.Element {
  const [hasCode, setHasCode] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    control,
    formState: { errors, isValid, isSubmitting },
  } = useForm<RegisterSchema>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      username: '',
      password: '',
      dob: '',
      code: '',
    },
  });

  const onSubmit = handleSubmit(async data => {
    setErrorMsg(null);
    try {
      await registerAccount({
        email: data.email,
        username: data.username,
        password: data.password,
        dateOfBirth: data.dob,
        code: data.code || undefined,
      });
      onOpenChange(false);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const respData = err.response?.data as unknown;
        let msg: string | undefined;

        if (typeof respData === 'string') {
          const match = /Error:\s*(?<msg>[^<\n]+)/i.exec(respData);
          msg = match?.groups?.msg?.trim() ?? respData;
        } else if (isErrorResponse(respData)) {
          msg = respData.message;
        } else if (
          typeof respData === 'object' &&
          respData !== null &&
          'message' in respData
        ) {
          msg = String(respData.message);
        }

        if (!msg) {
          if (err.response) {
            msg = `Registration failed (${err.response.status}). Check that the API is running.`;
          } else {
            const apiUrl =
              import.meta.env.VITE_APP_API_URL ?? 'http://localhost:5000';
            msg =
              err.message ??
              `Registration failed. Is the API running at ${apiUrl}?`;
          }
        }

        const lower = msg.toLowerCase();
        if (lower.includes('email')) {
          setError('email', { type: 'server', message: msg });
        } else if (lower.includes('username')) {
          setError('username', { type: 'server', message: msg });
        } else {
          setErrorMsg(msg);
        }
      } else {
        setErrorMsg(
          err instanceof Error ? err.message : 'Registration failed'
        );
      }
    }
  });

  const toggleCode = (val: boolean): void => {
    setHasCode(val);
    if (!val) setValue('code', '');
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Create An Account
          </DialogTitle>
        </DialogHeader>
        <form
          className="space-y-2 pt-2"
          onSubmit={e => {
            void onSubmit(e);
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="reg-email">Email</Label>
            <Input id="reg-email" type="email" {...register('email')} />
            {errors.email ? (
              <p className="text-xs text-destructive">{errors.email.message}</p>
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
            <Controller
              control={control}
              name="dob"
              render={({ field }): JSX.Element => (
                <DatePicker
                  date={field.value ? new Date(field.value) : undefined}
                  id="reg-dob"
                  label="Date Of Birth"
                  onChange={date => {
                    field.onChange(
                      date ? date.toISOString().split('T')[0] : ''
                    );
                  }}
                />
              )}
            />
            {errors.dob ? (
              <p className="text-xs text-destructive">{errors.dob.message}</p>
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
          {errorMsg ? (
            <p className="text-sm text-destructive text-center">{errorMsg}</p>
          ) : null}
          <Button
            className="mt-4 w-full"
            disabled={!isValid || isSubmitting}
            type="submit"
          >
            Register
          </Button>
          <GoogleAuthButton className="w-full" type="button" />
        </form>
      </DialogContent>
    </Dialog>
  );
}
