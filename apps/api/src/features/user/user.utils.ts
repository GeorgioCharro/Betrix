import { randomBytes } from 'node:crypto';

export const generateClientSeed = () => {
  return randomBytes(32).toString('hex');
};

export const generateServerSeed = () => {
  return randomBytes(32).toString('hex');
};

export const calculateLevel = (
  xp: number
): 'none' | 'vip' | 'vip_plus' | 'diamond' => {
  if (xp >= 10000) return 'diamond';
  if (xp >= 5000) return 'vip_plus';
  if (xp >= 1000) return 'vip';
  return 'none';
};
