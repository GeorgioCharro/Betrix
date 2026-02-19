/** Duration of each card's deal animation (ms) */
export const DEAL_ANIMATION_MS = 550;

/** Delay between starting each card's deal so they're dealt one by one (ms) */
export const DEAL_STAGGER_MS = 480;

/**
 * Time until all cards have finished their deal animation.
 * lastCardDelay = (cardCount - 1) * STAGGER, then it runs for ANIMATION_MS.
 */
export function getDealCompleteMs(cardCount: number): number {
  if (cardCount <= 0) return 0;
  const lastCardStartDelay = (cardCount - 1) * DEAL_STAGGER_MS;
  return lastCardStartDelay + DEAL_ANIMATION_MS;
}
