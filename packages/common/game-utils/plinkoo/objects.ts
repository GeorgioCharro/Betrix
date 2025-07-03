import { HEIGHT, WIDTH, obstacleRadius, sinkWidth } from './constants';
import { pad } from './padding';

export interface Obstacle {
  x: number;
  y: number;
  radius: number;
}

export interface Sink {
  x: number;
  y: number;
  width: number;
  height: number;
  multiplier?: number;
}
export type Risk = 'Low' | 'Medium' | 'High';

export const RISK_OPTIONS: Risk[] = ['Low', 'Medium', 'High'];

const BASE_MULTIPLIERS = [
  16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16,
];

const LOW_MULTIPLIERS: Record<number, number[]> = {
  16: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
  12: [10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10],
  8: [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6],
};

const MEDIUM_MULTIPLIERS: Record<number, number[]> = {
  16: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
  12: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
  8: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
};

const HIGH_MULTIPLIERS: Record<number, number[]> = {
  16: [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000],
  12: [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170],
  8: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
};

export const getMultipliers = (rows: number, risk: Risk = 'Low'): number[] => {
  let presetMap;
  if (risk === 'High') {
    presetMap = HIGH_MULTIPLIERS;
  } else if (risk === 'Medium') {
    presetMap = MEDIUM_MULTIPLIERS;
  } else {
    presetMap = LOW_MULTIPLIERS;
  }
  if (typeof presetMap[rows] !== 'undefined') {
    return presetMap[rows];
  }

  if (risk !== 'Low') {
    return getMultipliers(rows, 'Low');
  }

  const multipliers: number[] = [];
  const maxIndex = BASE_MULTIPLIERS.length - 1;
  for (let i = 0; i <= rows; i++) {
    const pos = (i / rows) * maxIndex;
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

export const createObstacles = (rows: number): Obstacle[] => {
  const obstacles: Obstacle[] = [];

  const BASE_ROWS = 16;
  const BASE_WIDTH = sinkWidth * (BASE_ROWS + 1);
  const spacing = BASE_WIDTH / (rows + 1);
  const radius = obstacleRadius * (spacing / sinkWidth);

  const sinkY = HEIGHT - 170;
  const BASE_BOTTOM_OFFSET = 35;
  const BOTTOM_OFFSET = BASE_BOTTOM_OFFSET + Math.max(0, BASE_ROWS - rows) * 2;
  const verticalSpacing = (sinkY - BOTTOM_OFFSET) / (rows + 1);

  const totalRows = rows + 2;
  for (let row = 2; row < totalRows; row++) {
    const numObstacles = row + 1;

    const y = row * verticalSpacing;
    for (let col = 0; col < numObstacles; col++) {
      const x = WIDTH / 2 - spacing * (row / 2 - col);

      obstacles.push({ x: pad(x), y: pad(y), radius });
    }
  }
  return obstacles;
};

export const createSinks = (rows: number, risk: Risk = 'Low'): Sink[] => {
  const sinks: Sink[] = [];

  const BASE_ROWS = 16;
  const BASE_WIDTH = sinkWidth * (BASE_ROWS + 1);
  const width = BASE_WIDTH / (rows + 1);
  const dynamicRadius = obstacleRadius * (width / sinkWidth);
  const SPACING = dynamicRadius * 2;
  const numSinks = rows + 1;
  const multipliers = getMultipliers(rows, risk);

  for (let i = 0; i < numSinks; i++) {
    const x =
      WIDTH / 2 + width * (i - Math.floor(numSinks / 2)) - SPACING * 1.5;
    const y = HEIGHT - 170;

    const height = width;

    sinks.push({ x, y, width, height, multiplier: multipliers[i] });
  }

  return sinks;
};
