import { useEffect, useRef, useState } from 'react';

import { Games } from '@/const/games';
import { cn } from '@/lib/utils';
import { BettingControls } from '@/features/games/common/components/BettingControls';
import GameSettingsBar from '@/features/games/common/components/game-settings';
import GameDescriptionAccordion from '@/features/games/common/components/GameDescriptionAccordion';
import { Input } from '@/components/ui/input';
import {
  clampTargetMultiplier,
  LIMBO_HOUSE_EDGE,
} from '@repo/common/game-utils/limbo/utils.js';
import type { LimboPlaceBetResponse } from '@repo/common/game-utils/limbo/types.js';

import { useLimboBetting } from './hooks/useBetting';

const MIN_TARGET = 1.01;
const MAX_TARGET = 1_000_000;
const MIN_PAYOUT = MIN_TARGET * (1 - LIMBO_HOUSE_EDGE);
const MAX_PAYOUT = MAX_TARGET * (1 - LIMBO_HOUSE_EDGE);

/** Same as dice: keep at most 6 pills so slide-out/slide-in cycle matches. */
const LIMBO_PILLS_MAX = 6;

export function Limbo(): JSX.Element {
  const [betAmount, setBetAmount] = useState(0);
  // Target multiplier shown to the user is the payout AFTER house edge
  const [targetMultiplier, setTargetMultiplier] = useState(
    (1 - LIMBO_HOUSE_EDGE) * 2
  );
  const [targetInput, setTargetInput] = useState(
    ((1 - LIMBO_HOUSE_EDGE) * 2).toString()
  );
  const [winChanceInput, setWinChanceInput] = useState('50'); // percentage as string
  const [currentMultiplier, setCurrentMultiplier] = useState(1);
  const [targetDisplayMultiplier, setTargetDisplayMultiplier] = useState(1);
  const [lastResult, setLastResult] = useState<LimboPlaceBetResponse | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [targetError, setTargetError] = useState<string | null>(null);
  const [winChanceError, setWinChanceError] = useState<string | null>(null);
  const [history, setHistory] = useState<
    { id: string; multiplier: number; isWin: boolean }[]
  >([]);

  const animationFrameRef = useRef<number | null>(null);
  const animationStartRef = useRef<number | null>(null);

  const { mutate, isPending } = useLimboBetting({
    setResult: result => {
      setLastResult(result);
      // Show the rolled multiplier derived from the provably-fair roll
      const roll = result.state.roll;
      const rolledMultiplier = roll > 0 ? 1 / roll : 0;
      setTargetDisplayMultiplier(rolledMultiplier);
    },
  });

  // Animate multiplier from 1x up to the rolled multiplier
  useEffect(() => {
    if (!lastResult) return;

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationStartRef.current = null;
    const duration = 500; // 0.5 seconds
    const startValue = 1;
    const endValue = targetDisplayMultiplier;
    setIsAnimating(true);

    const step = (timestamp: number) => {
      if (animationStartRef.current === null) {
        animationStartRef.current = timestamp;
      }
      const elapsed = timestamp - animationStartRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const value = startValue + (endValue - startValue) * progress;
      setCurrentMultiplier(value);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(step);
      } else {
        setIsAnimating(false);
        const didWin = lastResult.payout > 0;
        setHistory(prev => {
          const next = [
            ...prev,
            {
              id: `limbo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              multiplier: endValue,
              isWin: didWin,
            },
          ];
          if (next.length > LIMBO_PILLS_MAX) {
            next.shift();
          }
          return next;
        });
      }
    };

    animationFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [lastResult, targetDisplayMultiplier]);

  // Convert displayed payout multiplier back to internal "raw" target (before edge)
  const internalTarget = clampTargetMultiplier(
    targetMultiplier / (1 - LIMBO_HOUSE_EDGE)
  );
  const winChance = 1 / internalTarget;
  const payoutMultiplier = targetMultiplier;
  const profitOnWin = betAmount * (payoutMultiplier - 1);

  const isWin = lastResult && lastResult.payout > 0;
  const multiplierColor =
    !lastResult || isAnimating
      ? 'text-neutral-default'
      : isWin
        ? 'text-emerald-400'
        : 'text-red-400';

  const handleBet = async (): Promise<void> => {
    if (betAmount <= 0) return;
    if (targetError || winChanceError) return;
    mutate({
      betAmount,
      // Backend expects the raw target multiplier before house edge
      targetMultiplier: internalTarget,
    });
  };

  return (
    <>
      <div className="flex flex-col-reverse lg:flex-row w-full items-stretch mx-auto rounded-t-md overflow-hidden shadow-md">
        <BettingControls
          betAmount={betAmount}
          className="w-full lg:w-1/4"
          forceDisabled={Boolean(targetError || winChanceError)}
          isPending={isPending}
          betAmountLabelRight={
            <>
              <button
                type="button"
                className="px-3 py-0.5 rounded-full text-[11px] font-semibold bg-brand-weak text-neutral-default"
              >
                Manual
              </button>
              <button
                type="button"
                className="px-3 py-0.5 rounded-full text-[11px] font-semibold text-neutral-weak hover:text-neutral-default"
              >
                Auto
              </button>
            </>
          }
          onBet={handleBet}
          onBetAmountChange={(amount, mult = 1) => {
            setBetAmount(amount * mult);
          }}
          profitOnWin={profitOnWin}
          betButtonText="Bet"
        />

        <div className="flex-1 bg-brand-stronger flex flex-col">
          {/* Session history pills – same logic as dice: max 6, oldest slides out */}
          {history.length > 0 && (
            <div className="w-full px-4 pt-3">
              <div className="flex w-full flex-nowrap items-center justify-end gap-2 min-h-8">
                {history.map((h, index) => {
                  const resultsLength = history.length;
                  const animationClass =
                    resultsLength <= 5
                      ? 'animate-slideInLeft'
                      : index === 0
                        ? 'animate-slideOutLeft opacity-0'
                        : 'animate-slideInLeft';
                  return (
                    <span
                      className={cn(
                        'text-white p-2 rounded-full transition-transform w-16 text-center text-xs font-semibold shrink-0',
                        animationClass,
                        h.isWin ? 'bg-[#00e600] text-black' : 'bg-secondary-light'
                      )}
                      key={h.id}
                    >
                      {h.multiplier.toFixed(2)}x
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Big multiplier display */}
          <div className="flex-1 flex items-center justify-center px-4 md:px-12 lg:px-20 min-h-[140px] md:min-h-[200px] lg:min-h-[260px]">
            <span
              className={`text-5xl md:text-3xl lg:text-5xl xl:text-7xl font-bold ${multiplierColor}`}
            >
              {currentMultiplier.toFixed(2)}x
            </span>
          </div>

          {/* Target + Win chance row */}
          <div className="bg-brand-weak md:m-4 rounded-md px-4 py-3 md:px-8 md:py-4 lg:px-12 lg:py-5 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 lg:gap-6">
            <div>
              <p className="text-xs font-semibold text-neutral-weak mb-1">
                Target Multiplier
              </p>
              <Input
                type="number"
                step="0.01"
                value={targetInput}
                onChange={e => {
                  const raw = e.target.value;
                  setTargetInput(raw);

                  if (raw === '') {
                    setTargetError(
                      `Multiplier must be between ${MIN_TARGET.toFixed(
                        2
                      )}x and ${MAX_TARGET.toFixed(0)}x.`
                    );
                    return;
                  }

                  const val = Number(raw);
                  if (Number.isNaN(val)) {
                    setTargetError(
                      `Multiplier must be between ${MIN_TARGET.toFixed(
                        2
                      )}x and ${MAX_TARGET.toFixed(0)}x.`
                    );
                    return;
                  }

                  const rawInternal = val / (1 - LIMBO_HOUSE_EDGE);
                  if (rawInternal < MIN_TARGET || rawInternal > MAX_TARGET) {
                    setTargetError(
                      `Multiplier must be between ${MIN_TARGET.toFixed(
                        2
                      )}x and ${MAX_TARGET.toFixed(0)}x.`
                    );
                  } else {
                    setTargetError(null);
                  }
                  // Store as payout multiplier, but clamp using internal target bounds for safety
                  const internal = clampTargetMultiplier(rawInternal);
                  const adjustedPayout = (1 - LIMBO_HOUSE_EDGE) * internal;
                  setTargetMultiplier(adjustedPayout);
                  const nextWinChance = (1 / internal) * 100;
                  setWinChanceInput(nextWinChance.toString());
                  setWinChanceError(null);
                }}
                className="h-9 bg-brand-stronger border-brand-weaker text-sm"
              />
              {targetError && (
                <p className="mt-1 text-xs text-red-400">{targetError}</p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-weak mb-1">
                Win Chance (%)
              </p>
              <Input
                type="number"
                step="0.00000001"
                value={winChanceInput}
                onChange={e => {
                  const raw = e.target.value;
                  setWinChanceInput(raw);

                  if (raw === '') {
                    setWinChanceError('Win chance must be between 0 and 100.');
                    return;
                  }

                  const val = Number(raw);
                  if (Number.isNaN(val) || val <= 0 || val > 100) {
                    setWinChanceError('Win chance must be between 0 and 100.');
                    return;
                  }
                  setWinChanceError(null);

                  const probability = val / 100;
                  const rawInternal = 1 / probability;
                  if (rawInternal < MIN_TARGET || rawInternal > MAX_TARGET) {
                    setTargetError(
                      `Multiplier must be between ${MIN_TARGET.toFixed(
                        2
                      )}x and ${MAX_TARGET.toFixed(0)}x.`
                    );
                  } else {
                    setTargetError(null);
                  }
                  const internal = clampTargetMultiplier(rawInternal);
                  const adjustedPayout = (1 - LIMBO_HOUSE_EDGE) * internal;
                  setTargetMultiplier(adjustedPayout);
                  setTargetInput(adjustedPayout.toString());
                }}
                className="h-9 bg-brand-stronger border-brand-weaker text-sm"
              />
              {winChanceError && (
                <p className="mt-1 text-xs text-red-400">{winChanceError}</p>
              )}
            </div>
          </div>

        </div>
      </div>

      <GameSettingsBar game={Games.LIMBO} />
      <GameDescriptionAccordion game={Games.LIMBO} />
    </>
  );
}

