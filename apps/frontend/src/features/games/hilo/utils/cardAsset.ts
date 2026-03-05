import type { HiloCard } from '@repo/common/game-utils/hilo/types.js';

const RANK_NAMES: Record<number, string> = {
  1: 'ace',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'jack',
  12: 'queen',
  13: 'king',
};

export function getCardImageSrc(card: HiloCard): string {
  const rankName = RANK_NAMES[card.rank] ?? 'ace';
  return `/cards/${rankName}_of_${card.suit}.svg`;
}
