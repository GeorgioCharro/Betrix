import type { User } from '@repo/common/types';

import { key } from '../const/immutableConst';

export const getStoredUser = (): User | null => {
  const user = localStorage.getItem(key);
  return user ? (JSON.parse(user) as User) : null;
};

export const setStoredUser = (user: User | null): void => {
  if (user) {
    localStorage.setItem(key, JSON.stringify(user));
  } else {
    localStorage.removeItem(key);
  }
};
