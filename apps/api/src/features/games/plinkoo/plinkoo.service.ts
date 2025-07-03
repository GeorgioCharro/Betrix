import {
  BASE_MULTIPLIERS,
  HIGH_MULTIPLIERS,
  MEDIUM_MULTIPLIERS,
  LOW_MULTIPLIERS,
} from './plinkoo.constants';
import type { Risk } from './plinkoo.constants';

export interface PlinkooOutcome {
  point: number;
  multiplier: number;
  pattern: ('L' | 'R')[];
}

export const calculateOutcome = (
  clientSeed: string,
  rows = 16,
  risk: Risk = 'Low'
): PlinkooOutcome => {
  // Number of pegs (drops) is rows - 1
  const drops = Math.max(1, rows - 1);

  // Get multipliers for this board
  const multipliers = getMultipliers(drops, risk);

  // Track the path and the number of rights ("R")
  let point = 0;
  const pattern: ('L' | 'R')[] = [];

  for (let i = 0; i < drops; i++) {
    if (Math.random() > 0.5) {
      pattern.push('R');
      point++;
    } else {
      pattern.push('L');
    }
  }

  const multiplier = multipliers[point];

  return { point, multiplier, pattern };
};

export const getMultipliers = (drops: number, risk: Risk = 'Low'): number[] => {
  let presetMap;
  if (risk === 'High') {
    presetMap = HIGH_MULTIPLIERS;
  } else if (risk === 'Medium') {
    presetMap = MEDIUM_MULTIPLIERS;
  } else {
    presetMap = LOW_MULTIPLIERS;
  }

  if (typeof presetMap[drops] !== 'undefined') {
    return presetMap[drops];
  }

  if (risk !== 'Low') {
    return getMultipliers(drops, 'Low');
  }

  const multipliers: number[] = [];
  const maxIndex = BASE_MULTIPLIERS.length - 1;
  for (let i = 0; i <= drops; i++) {
    const pos = (i / drops) * maxIndex;
    const lower = Math.floor(pos);
    const upper = Math.ceil(pos);
    if (lower === upper) {
      multipliers.push(BASE_MULTIPLIERS[lower]);
    } else {
      const ratio = pos - lower;
      const value =
        BASE_MULTIPLIERS[lower] * (1 - ratio) + BASE_MULTIPLIERS[upper] * ratio;
      multipliers.push(parseFloat(value.toFixed(2)));
    }
  }
  return multipliers;
};
