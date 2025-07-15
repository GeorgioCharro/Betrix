import { HomeIcon, NotepadTextIcon } from 'lucide-react';

import { GAME_VALUES_MAPPING } from './games';

export const NAV_ITEMS = [
  { label: 'Home', path: '/casino/home', icon: HomeIcon },
  { label: 'My Bets', path: '/casino/my-bets', icon: NotepadTextIcon },
  GAME_VALUES_MAPPING.dice,
  GAME_VALUES_MAPPING.roulette,
];
