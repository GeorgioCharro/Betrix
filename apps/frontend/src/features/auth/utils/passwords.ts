// src/common/utils/password.ts
export interface PasswordStrength {
  value: number;
  label: string;
}

export const getPasswordStrength = (password: string): PasswordStrength => {
  let score = 0;
  if (password.length >= 6) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const percent = (score / 4) * 100;
  const label = ['Weak', 'Fair', 'Good', 'Strong'][score - 1] ?? '';

  return { value: percent, label };
};
