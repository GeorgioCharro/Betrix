import { BadgeDollarSignIcon } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { Games } from '@/const/games';

import BettingControls from './components/BettingControls';
import { CardDeck } from './components/CardDeck';
import { GameTable } from './components/GameTable';
import { getDealCompleteMs } from './constants';
import useBlackjackStore from './store/blackjackStore';
import GameSettingsBar from '../common/components/game-settings';

const baseResultBoxClass =
  'flex flex-col gap-2 border-[6px] rounded-xl p-6 min-w-[140px] items-center bg-brand-default';

function getResultBoxClassName(isWin: boolean, isPush: boolean): string {
  if (isWin) return `${baseResultBoxClass} border-green-500 text-green-500`;
  if (isPush) return `${baseResultBoxClass} border-yellow-500 text-yellow-500`;
  return `${baseResultBoxClass} border-red-500 text-red-500`;
}

export default function Blackjack(): JSX.Element {
  const { gameState } = useBlackjackStore();
  const isGameOver = gameState && !gameState.active;
  const [showResultOverlay, setShowResultOverlay] = useState(false);

  const payout = gameState?.payout ?? 0;
  const payoutMultiplier = gameState?.payoutMultiplier ?? 0;
  const isWin = Boolean(isGameOver && payoutMultiplier > 1);
  const isPush = Boolean(isGameOver && payoutMultiplier === 1);

  // Only show Win/Push/Lose after all cards have finished their deal animation
  useEffect(() => {
    const state = gameState?.state;
    if (!isGameOver || !state) {
      setShowResultOverlay(false);
      return;
    }
    const { dealer, player } = state;
    const cardCount =
      dealer.cards.length + player.reduce((s, h) => s + h.cards.length, 0);
    const delayMs = getDealCompleteMs(cardCount);
    const timer = setTimeout(() => {
      setShowResultOverlay(true);
    }, delayMs);
    return () => { clearTimeout(timer); };
  }, [isGameOver, gameState?.state]);

  return (
    <>
      <div className="flex w-full items-stretch mx-auto rounded-t-md overflow-hidden shadow-md">
        <BettingControls />
        <div className="flex flex-1 flex-col min-h-[320px] relative">
          <GameTable
            active={gameState?.active ?? false}
            gameId={gameState?.id}
            state={gameState?.state ?? null}
          />
          {gameState?.state !== undefined && gameState.state !== null ? (
            <CardDeck
              className="absolute right-4 top-4 z-20 pointer-events-none"
              size={Math.max(
                0,
                52 -
                  gameState.state.dealer.cards.length -
                  gameState.state.player.reduce(
                    (s, h) => s + h.cards.length,
                    0
                  )
              )}
            />
          ) : null}
          {isGameOver && showResultOverlay ? (
            <div
              className="absolute inset-0 z-10 flex items-center justify-center bg-brand-stronger/90 rounded-lg"
            >
              <div className={getResultBoxClassName(isWin, isPush)}>
                <p className="text-xl font-bold">
                  {isWin ? 'Win' : isPush ? 'Push' : 'Lose'}
                </p>
                <p className="text-lg font-bold flex items-center gap-1">
                  {payout.toFixed(2)}
                  <BadgeDollarSignIcon className="size-4" />
                </p>
                {payoutMultiplier > 0 && (
                  <p className="text-sm opacity-80">
                    {(payoutMultiplier * 100).toFixed(0)}% return
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <GameSettingsBar game={Games.BLACKJACK} />
    </>
  );
}
