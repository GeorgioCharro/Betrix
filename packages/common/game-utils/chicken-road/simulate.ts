/**
 * Simulates N bets per difficulty using the same logic as the game.
 * Run from repo root: npx tsx packages/common/game-utils/chicken-road/simulate.ts
 * Results are written to simulation-results.json in this directory.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DIFFICULTIES } from './constants.js';
import type { ChickenRoadDifficulty } from './constants.js';
import { generateOutcomesFromFloats, getMultiplierAfterHops } from './utils.js';

const BETS_PER_MODE = 100;
const TOTAL_TILES = 20;

function randomFloats(n: number): number[] {
  return Array.from({ length: n }, () => Math.random());
}

function runOneBet(difficulty: ChickenRoadDifficulty): {
  hopsCompleted: number;
  multiplierAtCrash: number;
  crashed: boolean;
} {
  const floats = randomFloats(TOTAL_TILES);
  const outcomes = generateOutcomesFromFloats(floats, difficulty);
  let hopsCompleted = 0;
  for (let i = 0; i < outcomes.length; i++) {
    if (!outcomes[i]) {
      const multiplierAtCrash =
        hopsCompleted === 0 ? 0 : getMultiplierAfterHops(hopsCompleted, difficulty);
      return { hopsCompleted, multiplierAtCrash, crashed: true };
    }
    hopsCompleted++;
  }
  const multiplierAtCrash = getMultiplierAfterHops(hopsCompleted, difficulty);
  return { hopsCompleted, multiplierAtCrash, crashed: false };
}

function runSimulation(): void {
  const difficulties: ChickenRoadDifficulty[] = ['easy', 'medium', 'hard', 'expert'];
  const allResults: Record<
    string,
    {
      difficulty: string;
      traps: number;
      safe: number;
      bets: number;
      results: { hopsCompleted: number; multiplierAtCrash: number; crashed: boolean }[];
      summary: {
        avgHops: number;
        maxHops: number;
        maxMultiplier: number;
        crashRatePct: number;
        reachedStep: Record<number, number>;
      };
    }
  > = {};

  for (const difficulty of difficulties) {
    const { safe, traps } = DIFFICULTIES[difficulty];
    const results: { hopsCompleted: number; multiplierAtCrash: number; crashed: boolean }[] = [];
    const reachedStep: Record<number, number> = {};

    for (let b = 0; b < BETS_PER_MODE; b++) {
      const one = runOneBet(difficulty);
      results.push(one);
      reachedStep[one.hopsCompleted] = (reachedStep[one.hopsCompleted] ?? 0) + 1;
    }

    const crashed = results.filter((r) => r.crashed).length;
    const avgHops =
      results.reduce((sum, r) => sum + r.hopsCompleted, 0) / results.length;
    const maxHops = Math.max(...results.map((r) => r.hopsCompleted));
    const maxMultiplier = Math.max(...results.map((r) => r.multiplierAtCrash));

    allResults[difficulty] = {
      difficulty,
      traps,
      safe,
      bets: BETS_PER_MODE,
      results,
      summary: {
        avgHops: Math.round(avgHops * 100) / 100,
        maxHops,
        maxMultiplier,
        crashRatePct: Math.round((crashed / BETS_PER_MODE) * 10000) / 100,
        reachedStep: Object.fromEntries(
          Object.entries(reachedStep).sort(([a], [b]) => Number(a) - Number(b))
        ),
      },
    };
  }

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const outPath = path.join(__dirname, 'simulation-results.json');
  fs.writeFileSync(outPath, JSON.stringify(allResults, null, 2), 'utf-8');
  console.log(`Simulated ${BETS_PER_MODE} bets per mode. Results written to:\n  ${outPath}`);
  console.log('\nSummary per difficulty:');
  for (const d of difficulties) {
    const s = allResults[d].summary;
    console.log(
      `  ${d}: avg hops ${s.avgHops}, max ${s.maxHops} (${s.maxMultiplier}x), crash rate ${s.crashRatePct}%`
    );
  }
}

runSimulation();
