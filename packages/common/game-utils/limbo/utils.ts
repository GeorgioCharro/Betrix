export const LIMBO_MIN_MULTIPLIER = 1.01;
export const LIMBO_MAX_MULTIPLIER = 1_000_000;
export const LIMBO_HOUSE_EDGE = 0.02; // 2%

export function clampTargetMultiplier(target: number): number {
  if (!Number.isFinite(target)) return LIMBO_MIN_MULTIPLIER;
  return Math.min(
    LIMBO_MAX_MULTIPLIER,
    Math.max(LIMBO_MIN_MULTIPLIER, target)
  );
}

/**
 * Core provably fair roll for Limbo.
 * The caller is responsible for providing a uniform float in (0, 1).
 */
export function normalizeRoll(rawFloat: number): number {
  if (!Number.isFinite(rawFloat)) return 0.5;
  const clamped = Math.min(Math.max(rawFloat, Number.EPSILON), 1 - Number.EPSILON);
  return clamped;
}

/** Small tolerance so "exactly" hitting the target (within float precision) counts as win. */
const WIN_EPSILON = 1e-12;

/** Given a target multiplier and provably fair roll, decide win/lose. */
export function resolveLimboBet(params: {
  targetMultiplier: number;
  roll: number; // 0–1 float from provably-fair RNG
}) {
  const target = clampTargetMultiplier(params.targetMultiplier);
  const roll = normalizeRoll(params.roll);
  const winChance = 1 / target;
  const didWin = roll <= winChance + WIN_EPSILON;
  const payoutMultiplier = didWin ? (1 - LIMBO_HOUSE_EDGE) * target : 0;

  return {
    didWin,
    payoutMultiplier,
    targetMultiplier: target,
    winChance,
  };
}

