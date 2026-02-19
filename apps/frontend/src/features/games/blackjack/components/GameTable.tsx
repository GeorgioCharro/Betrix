import type { SafeBlackjackGameState } from '@repo/common/game-utils/blackjack/types.js';
import { BlackjackActions } from '@repo/common/game-utils/blackjack/types.js';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

import { DEAL_ANIMATION_MS, DEAL_STAGGER_MS } from '../constants';
import { Card } from './Card';
import { CardDeck } from './CardDeck';

const RANK_VALUE: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  '10': 10, J: 10, Q: 10, K: 10, A: 11,
};

/** Blackjack value for a subset of cards (Ace = 11, then reduce if over 21) */
function handValueFromCards(cards: { rank: string }[]): number {
  let value = cards.reduce((sum, card) => sum + (RANK_VALUE[card.rank] ?? 10), 0);
  let aces = cards.filter(c => c.rank === 'A').length;
  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }
  return value;
}

interface GameTableProps {
  state: SafeBlackjackGameState | null;
  active: boolean;
  gameId?: string;
}

function isInitialDeal(state: SafeBlackjackGameState): boolean {
  return (
    state.player.length === 1 &&
    state.player[0].cards.length === 2 &&
    state.player[0].actions.length === 1 &&
    state.player[0].actions[0] === BlackjackActions.DEAL
  );
}

export function GameTable({ state, active, gameId }: GameTableProps): JSX.Element {
  /** Keys that have finished their deal animation (get delay 0) */
  const animatedKeysRef = useRef(new Set<string>());
  /** Delays assigned to cards currently animating - preserved across re-renders so stagger isn't lost */
  const pendingDelaysRef = useRef(new Map<string, number>());
  const wasInitialDealRef = useRef(false);
  const lastGameIdRef = useRef<string | undefined>(undefined);

  /** How many dealer cards to include in the shown total (revealed one-by-one as each card's animation completes) */
  const [dealerRevealedCount, setDealerRevealedCount] = useState(0);

  // New bet => new game id. Reset animation tracking so the first cards always animate.
  if (gameId && lastGameIdRef.current !== gameId) {
    animatedKeysRef.current.clear();
    pendingDelaysRef.current.clear();
    wasInitialDealRef.current = false;
    lastGameIdRef.current = gameId;
  }

  const cardCount = state
    ? state.dealer.cards.length +
      state.player.reduce((s, h) => s + h.cards.length, 0)
    : 0;
  const dealerCardCount = state?.dealer.cards.length ?? 0;

  // After all current cards finish their deal animation, move them to "animated". Depend on gameId so a new bet cancels the previous game's timeout and we don't mark new cards as "already animated".
  useEffect(() => {
    if (cardCount === 0) return;
    const lastDelay = (cardCount - 1) * DEAL_STAGGER_MS;
    const moveToAnimatedMs = lastDelay + DEAL_ANIMATION_MS;
    const t = setTimeout(() => {
      pendingDelaysRef.current.forEach((_, key) => {
        animatedKeysRef.current.add(key);
      });
      pendingDelaysRef.current.clear();
    }, moveToAnimatedMs);
    return () => { clearTimeout(t); };
  }, [cardCount, gameId]);

  // Reveal dealer total one card at a time as each dealer card's deal animation completes (deal order is player first, then dealer)
  const playerCardCount = state
    ? state.player.reduce((s, h) => s + h.cards.length, 0)
    : 0;
  useEffect(() => {
    if (!state || dealerCardCount === 0) {
      setDealerRevealedCount(0);
      return;
    }
    setDealerRevealedCount(0);
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < dealerCardCount; i++) {
      const dealerCardDealStartMs = (playerCardCount + i) * DEAL_STAGGER_MS;
      const revealAtMs = dealerCardDealStartMs + DEAL_ANIMATION_MS;
      const t = setTimeout(() => {
        setDealerRevealedCount(prev => Math.max(prev, i + 1));
      }, revealAtMs);
      timeouts.push(t);
    }
    return () => { timeouts.forEach(clearTimeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dealerCardCount and playerCardCount derive from state
  }, [gameId, dealerCardCount, playerCardCount]);

  if (!state) {
    animatedKeysRef.current.clear();
    pendingDelaysRef.current.clear();
    wasInitialDealRef.current = false;
    lastGameIdRef.current = gameId;
    return (
      <div className="relative flex flex-1 flex-col items-center justify-center gap-8 rounded-lg bg-brand-stronger/80 p-8">
        <p className="text-neutral-weaker">Place a bet to start the game</p>
        <CardDeck className="absolute right-6 top-6" size={4} />
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div
              className="h-20 w-14 flex-shrink-0 rounded-lg border-2 border-brand-weaker bg-brand-strong/50"
              key={i}
            />
          ))}
        </div>
      </div>
    );
  }

  const { player, dealer } = state;
  const dealerRevealed = !active || dealer.cards.length > 1;
  // Show dealer total building up as each card's animation completes (one after the other)
  const dealerVisibleCards = dealer.cards.slice(0, dealerRevealedCount);
  const dealerValue =
    dealerRevealedCount > 0
      ? handValueFromCards(dealerVisibleCards)
      : null;

  const nowInitialDeal = isInitialDeal(state);
  if (nowInitialDeal && !wasInitialDealRef.current) {
    animatedKeysRef.current.clear();
    pendingDelaysRef.current.clear();
  }
  wasInitialDealRef.current = nowInitialDeal;

  // Deal order: player cards first (so e.g. double card animates before dealer), then dealer cards one by one
  const dealOrderKeys: string[] = [];
  player.forEach((hand, handIndex) => {
    hand.cards.forEach((_, i) => dealOrderKeys.push(`p-${handIndex}-${i}`));
  });
  dealer.cards.forEach((_, i) => dealOrderKeys.push(`d-${i}`));

  const getDealDelay = (key: string): number => {
    if (animatedKeysRef.current.has(key)) return 0;
    const pending = pendingDelaysRef.current.get(key);
    if (pending !== undefined) return pending;
    const index = dealOrderKeys.indexOf(key);
    const delay = index >= 0 ? index * DEAL_STAGGER_MS : 0;
    pendingDelaysRef.current.set(key, delay);
    return delay;
  };

  return (
    <div className="relative flex flex-1 flex-col gap-8 rounded-lg bg-brand-stronger/80 p-6">
      {/* Deck is rendered in parent (Blackjack index) so it stays above the Win/Lose/Push overlay */}

      {/* Dealer */}
      <div className="relative z-10 flex flex-col items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-neutral-weaker">
          Dealer
          {dealerRevealedCount > 0 && dealerValue !== null && (
            <span className="ml-2 font-bold text-neutral-default">
              {dealerValue > 21 ? 'Bust' : dealerValue}
            </span>
          )}
          {dealerRevealedCount === 0 && dealer.cards.length > 0 && (
            <span className="ml-2 font-bold text-neutral-weaker">—</span>
          )}
        </span>
        <div className="flex flex-wrap justify-center gap-2">
          {dealer.cards.map((card, i) => {
            const key = `d-${i}`;
            return (
              <Card
                animateDeal
                dealDelayMs={getDealDelay(key)}
                faceDown={!dealerRevealed && i === 1}
                key={gameId ? `${gameId}-${key}` : key}
                rank={card.rank}
                suit={card.suit}
              />
            );
          })}
        </div>
      </div>

      {/* Player hands (support split) */}
      <div className="relative z-10 flex flex-wrap justify-center gap-8">
        {player.map((hand, handIndex) => {
          const isBust = hand.actions.includes(BlackjackActions.BUST);
          const isBlackjack = hand.actions.includes(BlackjackActions.BLACKJACK);
          const isStand = hand.actions.includes(BlackjackActions.STAND);
          const isFull = hand.actions.includes(BlackjackActions.FULL);
          const handKey = `hand-${handIndex}-${hand.cards.map(c => `${c.rank}-${c.suit}`).join(',')}`;

          return (
            // handIndex needed for stable key when same cards in split
             
            <div
              className={cn(
                'flex flex-col items-center gap-2 rounded-lg p-3',
                (isBust || isStand || isFull || isBlackjack) ? 'bg-brand-strong/40' : undefined
              )}
              key={handKey}
            >
              <span className="text-xs font-medium uppercase tracking-wide text-neutral-weaker">
                Hand {player.length > 1 ? handIndex + 1 : ''}
                <span className="ml-2 font-bold text-neutral-default">
                  {hand.value > 21 ? 'Bust' : hand.value}
                </span>
              </span>
              <div className="flex flex-wrap justify-center gap-2">
                {hand.cards.map((card, i) => {
                  const key = `p-${handIndex}-${i}`;
                  return (
                    <Card
                      animateDeal
                      dealDelayMs={getDealDelay(key)}
                      key={gameId ? `${gameId}-${key}` : key}
                      rank={card.rank}
                      suit={card.suit}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
