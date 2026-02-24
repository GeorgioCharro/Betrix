/**
 * Simulates 300,000 bets per difficulty using the same logic as the game.
 * Run from repo root: node packages/common/game-utils/chicken-road/simulate.mjs
 * Results written to simulation-results.json in this directory.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RTP = 0.98;
const TOTAL_TILES = 20;
const DIFFICULTIES = {
  easy: { traps: 1, safe: 19 },
  medium: { traps: 3, safe: 17 },
  hard: { traps: 5, safe: 15 },
  expert: { traps: 10, safe: 10 },
};

function buildMultiplierTable(safe, total) {
  const table = [];
  let product = 1;
  for (let n = 1; n <= safe; n++) {
    product *= (safe - (n - 1)) / (total - (n - 1));
    table.push({ reachProbability: product, multiplier: Math.round((RTP / product) * 100) / 100 });
  }
  return table;
}

const MULTIPLIER_TABLES = {};
for (const [diff, { safe }] of Object.entries(DIFFICULTIES)) {
  MULTIPLIER_TABLES[diff] = buildMultiplierTable(safe, TOTAL_TILES);
}

function getMultiplierAfterHops(hops, difficulty) {
  if (hops <= 0) return 1;
  const table = MULTIPLIER_TABLES[difficulty];
  if (hops > table.length) return table[table.length - 1]?.multiplier ?? 1;
  return table[hops - 1].multiplier;
}

function shuffleWithFloats(arr, floats) {
  for (let i = arr.length - 1; i > 0; i--) {
    const floatIndex = arr.length - 1 - i;
    const f = floats[floatIndex] ?? 0;
    const j = Math.floor(f * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function generateOutcomes(floats, difficulty) {
  const { safe, traps } = DIFFICULTIES[difficulty];
  const deck = [...Array(safe).fill(true), ...Array(traps).fill(false)];
  shuffleWithFloats(deck, floats);
  return deck;
}

function randomFloats(n) {
  return Array.from({ length: n }, () => Math.random());
}

function runOneBet(difficulty) {
  const floats = randomFloats(TOTAL_TILES);
  const outcomes = generateOutcomes(floats, difficulty);
  let hopsCompleted = 0;
  for (let i = 0; i < outcomes.length; i++) {
    if (!outcomes[i]) {
      const multiplierAtCrash = hopsCompleted === 0 ? 0 : getMultiplierAfterHops(hopsCompleted, difficulty);
      return { hopsCompleted, multiplierAtCrash, crashed: true };
    }
    hopsCompleted++;
  }
  return {
    hopsCompleted,
    multiplierAtCrash: getMultiplierAfterHops(hopsCompleted, difficulty),
    crashed: false,
  };
}

const BETS_PER_MODE = 300_000;
const TARGET_STEP = 10;
const difficulties = ['easy', 'medium', 'hard', 'expert'];
const allResults = {};

for (const difficulty of difficulties) {
  const { safe, traps } = DIFFICULTIES[difficulty];
  const results = [];
  const reachedStep = {};

  for (let b = 0; b < BETS_PER_MODE; b++) {
    const one = runOneBet(difficulty);
    results.push(one);
    reachedStep[one.hopsCompleted] = (reachedStep[one.hopsCompleted] ?? 0) + 1;
  }

  const crashed = results.filter((r) => r.crashed).length;
  const avgHops = results.reduce((sum, r) => sum + r.hopsCompleted, 0) / results.length;
  const maxHops = results.reduce((max, r) => (r.hopsCompleted > max ? r.hopsCompleted : max), 0);
  const maxMultiplier = results.reduce(
    (max, r) => (r.multiplierAtCrash > max ? r.multiplierAtCrash : max),
    0
  );

  const reachedStep10Count = results.filter((r) => r.hopsCompleted >= TARGET_STEP).length;
  const reachedStep10Pct = Math.round((reachedStep10Count / BETS_PER_MODE) * 10000) / 100;
  const table = MULTIPLIER_TABLES[difficulty];
  const theoreticalReachStep10 =
    TARGET_STEP <= table.length ? table[TARGET_STEP - 1].reachProbability : 0;
  const theoreticalReachStep10Pct = Math.round(theoreticalReachStep10 * 10000) / 100;

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
      oddsReachStep10: {
        count: reachedStep10Count,
        pct: reachedStep10Pct,
        theoreticalPct: theoreticalReachStep10Pct,
      },
    },
  };
}

const outPath = path.join(__dirname, 'simulation-results.json');
fs.writeFileSync(outPath, JSON.stringify(allResults, null, 2), 'utf-8');
console.log(`Simulated ${BETS_PER_MODE} bets per mode. Results written to:\n  ${outPath}`);
console.log(`\nOdds of reaching step ${TARGET_STEP} (simulated vs theoretical):`);
for (const d of difficulties) {
  const o = allResults[d].summary.oddsReachStep10;
  console.log(
    `  ${d}: ${o.count}/${BETS_PER_MODE} (${o.pct}%) simulated, ${o.theoreticalPct}% theoretical`
  );
}
console.log('\nSummary per difficulty:');
for (const d of difficulties) {
  const s = allResults[d].summary;
  console.log(
    `  ${d}: avg hops ${s.avgHops}, max ${s.maxHops} (${s.maxMultiplier}x), crash rate ${s.crashRatePct}%`
  );
}
