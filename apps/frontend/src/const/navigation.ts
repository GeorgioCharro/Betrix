import { HomeIcon, NotepadTextIcon, TrophyIcon } from 'lucide-react';
import type { ComponentType } from 'react';

import { GAME_VALUES_MAPPING } from './games';

export type NavItemType = 'general' | 'games';

export interface NavItem {
  label: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
  type: NavItemType;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Home', path: '/casino/home', icon: HomeIcon, type: 'general' },
  {
    label: 'My Bets',
    path: '/casino/my-bets',
    icon: NotepadTextIcon,
    type: 'general',
  },
  {
    label: 'Challenges',
    path: '/casino/challenges',
    icon: TrophyIcon,
    type: 'general',
  },
  { ...GAME_VALUES_MAPPING.dice, type: 'games' },
  { ...GAME_VALUES_MAPPING.roulette, type: 'games' },
  { ...GAME_VALUES_MAPPING.mines, type: 'games' },
  { ...GAME_VALUES_MAPPING.keno, type: 'games' },
  { ...GAME_VALUES_MAPPING.plinkoo, type: 'games' },
  { ...GAME_VALUES_MAPPING.blackjack, type: 'games' },
];
