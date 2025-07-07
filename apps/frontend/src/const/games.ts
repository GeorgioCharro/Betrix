import { DicesIcon, ShipWheelIcon } from 'lucide-react';

export enum Games {
  DICE = 'dice',
  ROULETTE = 'roulette',
  MINES = 'mines',
  KENO = 'keno',
  BLACKJACK = 'blackjack',
  PLINKOO = 'plinkoo',
}

export type Game = (typeof Games)[keyof typeof Games];

export const GAME_VALUES_MAPPING = {
  [Games.DICE]: { label: 'Dice', icon: DicesIcon, path: '/casino/games/dice' },
  [Games.ROULETTE]: {
    label: 'Roulette',
    icon: ShipWheelIcon,
    path: '/casino/games/roulette',
  },
  [Games.MINES]: {
    label: 'Mines',
    // icon: DicesIcon,
    path: '/casino/games/mines',
  },
  [Games.KENO]: {
    label: 'Keno',
    // icon: DicesIcon,
    path: '/casino/games/keno',
  },
  [Games.PLINKOO]: {
    label: 'Plinkoo',
    // icon: DicesIcon,
    path: '/casino/games/plinkoo',
  },
};

export const GAMES_DROPDOWN_OPTIONS = [
  {
    label: GAME_VALUES_MAPPING[Games.DICE].label,
    value: Games.DICE,
  },
  {
    label: GAME_VALUES_MAPPING[Games.ROULETTE].label,
    value: Games.ROULETTE,
  },
  {
    label: GAME_VALUES_MAPPING[Games.MINES].label,
    value: Games.MINES,
  },
  {
    label: GAME_VALUES_MAPPING[Games.KENO].label,
    value: Games.KENO,
  },
  {
    label: GAME_VALUES_MAPPING[Games.PLINKOO].label,
    value: Games.PLINKOO,
  },
];
