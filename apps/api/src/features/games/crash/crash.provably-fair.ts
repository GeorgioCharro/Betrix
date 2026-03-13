import crypto from 'node:crypto';

// 3% house edge, similar to common crypto crash games.
export const CRASH_HOUSE_EDGE = 0.03;

export function generateCrashServerSeed(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateCrashClientSeed(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function getServerSeedHash(serverSeed: string): string {
  return crypto.createHash('sha256').update(serverSeed).digest('hex');
}

export function getCrashHash(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
): string {
  const hmac = crypto.createHmac('sha256', serverSeed);
  hmac.update(`${clientSeed}:${nonce}`);
  return hmac.digest('hex');
}

/**
 * Convert a hash into a crash multiplier with a fixed house edge.
 *
 * Common crash-style approach:
 * - Use an instant 1.00x crash for a small subset of hashes
 * - Otherwise, compute:
 *     crash = floor( (RTP / (1 - r)) * 100 ) / 100
 *   where r ∈ [0, 1) is derived from the hash and RTP = 1 - houseEdge.
 */
export function hashToCrashMultiplier(hash: string): number {
  // Use first 52 bits of the hash as an integer
  const int = parseInt(hash.slice(0, 13), 16); // 13 hex chars ~ 52 bits
  const max = 2 ** 52;
  const r = int / max;

  // Small chance of instant 1.00x crash
  // Use 1/101 ≈ 0.99% chance, closer to typical Crash games.
  if (int % 101 === 0) {
    return 1.0;
  }

  const rtp = 1 - CRASH_HOUSE_EDGE; // 0.99
  const crash = rtp / (1 - r);
  // Ensure crash multiplier is never below 1.00x after rounding.
  return Math.max(1.0, Math.floor(crash * 100) / 100);
}

export function computeCrashMultiplier(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
): { hash: string; crashMultiplier: number } {
  const hash = getCrashHash(serverSeed, clientSeed, nonce);
  const crashMultiplier = hashToCrashMultiplier(hash);
  return { hash, crashMultiplier };
}

