import { z } from 'zod';

export const registerSchema = z.object({
  email: z.email({ message: 'Invalid email' }),
  username: z
    .string()
    .min(2, { message: 'Too short' })
    .max(15, { message: 'Max 15 characters' }),
  password: z
    .string()
    .min(6, { message: 'At least 6 characters' })
    .regex(/[A-Z]/, { message: 'Must include a capital letter' })
    .regex(/[^A-Za-z0-9]/, { message: 'Must include a special character' }),
  dob: z.string().refine(
    val => {
      const dob = new Date(val);
      if (Number.isNaN(dob.getTime())) return false;
      const ageDiff = Date.now() - dob.getTime();
      const ageDate = new Date(ageDiff);
      return ageDate.getUTCFullYear() - 1970 >= 18;
    },
    { message: 'You must be at least 18 years old' }
  ),
  code: z.string().optional(),
});

export type RegisterSchema = z.infer<typeof registerSchema>;
