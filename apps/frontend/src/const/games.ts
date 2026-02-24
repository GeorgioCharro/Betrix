import {
  DicesIcon,
  ShipWheelIcon,
  BombIcon,
  GemIcon,
  JoystickIcon,
  ClubIcon,
  Rocket,
} from 'lucide-react';

export enum Games {
  DICE = 'dice',
  ROULETTE = 'roulette',
  MINES = 'mines',
  KENO = 'keno',
  BLACKJACK = 'blackjack',
  PLINKOO = 'plinkoo',
  CHICKEN_ROAD = 'chicken-road',
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
    icon: BombIcon,
    path: '/casino/games/mines',
  },
  [Games.KENO]: {
    label: 'Keno',
    icon: GemIcon,
    path: '/casino/games/keno',
  },
  [Games.BLACKJACK]: {
    label: 'Blackjack',
    icon: ClubIcon,
    path: '/casino/games/blackjack',
  },
  [Games.PLINKOO]: {
    label: 'Plinkoo',
    icon: JoystickIcon,
    path: '/casino/games/plinkoo',
  },
  [Games.CHICKEN_ROAD]: {
    label: 'Rocket',
    icon: Rocket,
    path: '/casino/games/chicken-road',
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
  {
    label: GAME_VALUES_MAPPING[Games.BLACKJACK].label,
    value: Games.BLACKJACK,
  },
  {
    label: GAME_VALUES_MAPPING[Games.CHICKEN_ROAD].label,
    value: Games.CHICKEN_ROAD,
  },
];
