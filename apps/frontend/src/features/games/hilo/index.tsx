import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';

import {
  getHiloStartCard,
  getActiveHilo,
  advanceHilo,
  cashOutHilo,
} from '@/api/games/hilo';
import type { HiloActiveRoundResult } from '@/api/games/hilo';
import type { HiloCard } from '@repo/common/game-utils/hilo/types.js';
import {
  getHiloMultipliers,
  getHiloProbabilities,
} from '@repo/common/game-utils/hilo/utils.js';
import {
  HILO_RANK_MAX,
  HILO_RANK_MIN,
} from '@repo/common/game-utils/hilo/constants.js';
import { Games } from '@/const/games';
import { useBalance } from '@/hooks/useBalance';
import { cn } from '@/lib/utils';

import GameSettingsBar from '@/features/games/common/components/game-settings';
import GameDescriptionAccordion from '@/features/games/common/components/GameDescriptionAccordion';
import { BetAmountInput } from '@/features/games/common/components/BetAmountInput';
import { BetButton } from '@/features/games/common/components/BettingControls';

import { Card } from '@/features/games/blackjack/components/Card';

const RANK_LABELS: Record<number, string> = {
  1: 'A',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
};

export function Hilo(): JSX.Element {
  const queryClient = useQueryClient();
  const balance = useBalance();
  const [startCard, setStartCard] = useState<HiloCard | null>(null);
  const [betAmount, setBetAmount] = useState(0);
  const [selectedSide, setSelectedSide] = useState<'higher' | 'lower' | 'equal'>(
    'higher',
  );
  const [lastResult, setLastResult] = useState<{
    type: 'win' | 'lose' | 'cashout';
    nextCard?: HiloCard;
    outcome?: string;
    payout?: number;
    displayCard?: HiloCard;
    multiplier?: number;
    stake?: number;
  } | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [hasPlacedInitialBet, setHasPlacedInitialBet] = useState(false);
  const [roundCards, setRoundCards] = useState<
    { card: HiloCard; cumulativeMultiplier: number }[]
  >([]);

  const { data: activeRound, refetch: refetchActiveHilo } = useQuery({
    queryKey: ['activeHilo'],
    queryFn: async () => {
      const res = await getActiveHilo();
      return res.data;
    },
  });

  const { mutate: fetchStartCard, isPending: isSkipping } = useMutation({
    mutationFn: () => getHiloStartCard(),
    onSuccess: (res) => {
      setStartCard(res.data.card);
      setLastResult(null);
      setAuthError(null);
      // Starting total multiplier is always 1.00
      setRoundCards([{ card: res.data.card, cumulativeMultiplier: 1 }]);
    },
    onError: (err: Error) => {
      // If user is not authenticated, stop auto-fetching to avoid request spam
      if (/unauthorized|not authenticated/i.test(err.message)) {
        setAuthError('Please sign in to play Hilo.');
      }
    },
  });

  const { mutate: doAdvance, isPending: isBetting } = useMutation({
    mutationFn: (choice: 'higher' | 'lower' | 'equal') =>
      advanceHilo(activeRound ? activeRound.betAmount : betAmount, choice),
    onSuccess: (res) => {
      queryClient.setQueryData(['balance'], () => res.data.balance);
      // Backend uses cumulative multiplier: totalMultiplier is the product of each step's mult.
      const totalMultiplierAfterStep = res.data.totalMultiplier ?? 1;

      setRoundCards((prev) => {
        const base =
          prev.length === 0 && currentCard
            ? [{ card: currentCard, cumulativeMultiplier: 1 }]
            : prev;
        return [
          ...base,
          { card: res.data.nextCard, cumulativeMultiplier: totalMultiplierAfterStep },
        ];
      });
      if (res.data.lost) {
        const stake = res.data.betAmount;
        const nextBetAmount =
          res.data.balance >= stake ? stake : 0;
        setLastResult({
          type: 'lose',
          nextCard: res.data.nextCard,
          outcome: res.data.outcome,
          displayCard: res.data.nextCard,
        });
        // End round immediately in UI and reset controls
        queryClient.setQueryData(['activeHilo'], () => null);
        setSelectedSide('higher');
        setBetAmount(nextBetAmount);
        setHasPlacedInitialBet(false);
        // Next round will start from the losing card (server keeps it as start),
        // so keep it as the visible start card and reset round history.
        setStartCard(res.data.nextCard);
        setRoundCards([{ card: res.data.nextCard, cumulativeMultiplier: 1 }]);
      } else {
        const mult = getHiloMultipliers(res.data.currentCard.rank);
        queryClient.setQueryData(['activeHilo'], () => ({
          id: res.data.id,
          currentCard: res.data.currentCard,
          betAmount: res.data.betAmount,
          totalMultiplier: res.data.totalMultiplier,
          accumulatedProfit: res.data.accumulatedProfit,
          multiplierHigher: mult.multiplierHigher,
          multiplierLower: mult.multiplierLower,
        }));
        setLastResult(null);
        setHasPlacedInitialBet(false);
      }
    },
    onError: (err: Error) => {
      window.alert(err.message || 'Advance failed');
    },
  });

  const { mutate: doCashOut, isPending: isCashingOut } = useMutation({
    mutationFn: () => cashOutHilo(),
    onSuccess: (res) => {
      const prevActive = queryClient.getQueryData<HiloActiveRoundResult | null>([
        'activeHilo',
      ]);
      queryClient.setQueryData(['balance'], () => res.data.balance);
      const stake = prevActive?.betAmount ?? 0;
      const multiplier = stake > 0 ? res.data.payout / stake : undefined;
      setLastResult({
        type: 'cashout',
        payout: res.data.payout,
        displayCard: prevActive?.currentCard,
        multiplier,
        stake,
      });
      // Round is over: clear active state and reset controls
      queryClient.setQueryData(['activeHilo'], () => null);
      setSelectedSide('higher');
      const nextBetAmount =
        res.data.balance >= stake ? stake : 0;
      setBetAmount(nextBetAmount);
      setHasPlacedInitialBet(false);
      // Next round will start from the final card of this round (server keeps it),
      // so keep it as the visible start card and reset round history.
      if (prevActive?.currentCard) {
        setStartCard(prevActive.currentCard);
        setRoundCards([{ card: prevActive.currentCard, cumulativeMultiplier: 1 }]);
      }
    },
    onError: (err: Error) => {
      window.alert(err.message || 'Cash out failed');
    },
  });

  // When no active round, keep a start card ready
  useEffect(() => {
    if (
      !activeRound &&
      !startCard &&
      !isSkipping &&
      !authError &&
      // After a loss or cashout, wait until user presses Bet again
      (!lastResult ||
        ((lastResult.type !== 'lose' && lastResult.type !== 'cashout') ||
          hasPlacedInitialBet))
    ) {
      fetchStartCard();
    }
  }, [
    activeRound,
    startCard,
    isSkipping,
    authError,
    lastResult,
    hasPlacedInitialBet,
    fetchStartCard,
  ]);

  // After a losing round, briefly show the losing card in the center
  const losingCard =
    !activeRound && !startCard && lastResult?.type === 'lose'
      ? lastResult.displayCard ?? lastResult.nextCard
      : null;

  const cashoutCard =
    !activeRound && !startCard && lastResult?.type === 'cashout'
      ? lastResult.displayCard ?? null
      : null;

  const currentCard = activeRound?.currentCard ?? startCard ?? losingCard ?? cashoutCard;
  const multipliers = currentCard
    ? getHiloMultipliers(currentCard.rank)
    : { multiplierHigher: 0, multiplierLower: 0 };
  const probabilities = currentCard
    ? getHiloProbabilities(currentCard.rank)
    : { probabilityHigher: 0, probabilityLower: 0, probabilityEqual: 0 };

  const isAce = currentCard?.rank === HILO_RANK_MIN;
  const isKing = currentCard?.rank === HILO_RANK_MAX;

  type OptionKey = 'higher' | 'lower' | 'equal';
  interface OptionMeta {
    key: OptionKey;
    label: string;
    pct: number;
    disabled: boolean;
  }

  const higherOrSamePct =
    (probabilities.probabilityHigher + probabilities.probabilityEqual) * 100;
  const lowerOrSamePct =
    (probabilities.probabilityLower + probabilities.probabilityEqual) * 100;

  let topOption: OptionMeta = {
    key: 'higher',
    label: 'Higher or Same',
    pct: higherOrSamePct,
    disabled: probabilities.probabilityHigher === 0,
  };
  let bottomOption: OptionMeta = {
    key: 'lower',
    label: 'Lower or Same',
    pct: lowerOrSamePct,
    disabled: probabilities.probabilityLower === 0,
  };

  if (isAce) {
    topOption = {
      key: 'higher',
      label: 'Higher',
      pct: probabilities.probabilityHigher * 100,
      disabled: probabilities.probabilityHigher === 0,
    };
    bottomOption = {
      key: 'equal',
      label: 'Equal',
      pct: probabilities.probabilityEqual * 100,
      disabled: probabilities.probabilityEqual === 0,
    };
  } else if (isKing) {
    topOption = {
      key: 'lower',
      label: 'Lower',
      pct: probabilities.probabilityLower * 100,
      disabled: probabilities.probabilityLower === 0,
    };
    bottomOption = {
      key: 'equal',
      label: 'Equal',
      pct: probabilities.probabilityEqual * 100,
      disabled: probabilities.probabilityEqual === 0,
    };
  }

  const roundBetAmount = activeRound?.betAmount ?? 0;
  const stakeForProfit = activeRound ? roundBetAmount : betAmount;
  const accumulatedProfit = activeRound?.accumulatedProfit ?? 0;
  const profitHigher =
    stakeForProfit > 0 && multipliers.multiplierHigher > 0
      ? stakeForProfit * (multipliers.multiplierHigher - 1)
      : 0;
  const profitLower =
    stakeForProfit > 0 && multipliers.multiplierLower > 0
      ? stakeForProfit * (multipliers.multiplierLower - 1)
      : 0;
  const profitEqual =
    stakeForProfit > 0 && 'multiplierEqual' in multipliers && multipliers.multiplierEqual > 0
      ? stakeForProfit * (multipliers.multiplierEqual - 1)
      : 0;

  // Backend uses cumulative multiplier: payout = stake * totalMultiplier, profit = stake * (totalMultiplier - 1).
  const currentTotalMultiplier = activeRound?.totalMultiplier ?? 1;
  const totalProfitValue = activeRound ? accumulatedProfit : 0;

  const canCashOutNow = Boolean(activeRound && accumulatedProfit > 0);

  const isAdvanceDisabled =
    !currentCard ||
    isBetting ||
    (activeRound ? false : betAmount <= 0 || (balance != null && betAmount > balance));

  const isPrimaryDisabled = activeRound
    ? isCashingOut || isBetting || !canCashOutNow
    : isBetting || isCashingOut || (!hasPlacedInitialBet && isAdvanceDisabled);

  const canAdvance = hasPlacedInitialBet || Boolean(activeRound);

  return (
    <div className="relative w-full">
      <div className="flex flex-col-reverse lg:flex-row w-full items-stretch mx-auto rounded-t-md overflow-hidden shadow-md">
        <div className="bg-brand-weak flex flex-col gap-4 p-3 w-full lg:w-1/4">
          <div className="flex flex-col-reverse sm:flex-col gap-4">
            <BetAmountInput
              betAmount={activeRound ? activeRound.betAmount : betAmount}
              onBetAmountChange={(amount) => setBetAmount(amount)}
              isInputDisabled={Boolean(activeRound)}
            />
            <div className="flex gap-2">
              <BetButton
              betButtonText={activeRound ? 'Cash out' : 'Bet'}
              disabled={isPrimaryDisabled}
              isPending={activeRound ? isCashingOut : isBetting}
              loadingImage="/games/dice/loading-dice.png"
              onClick={() => {
                if (activeRound) {
                  doCashOut();
                } else {
                  // Lock in the intent to bet; first advance will start the round
                  if (betAmount <= 0) {
                    window.alert('Enter a bet amount first.');
                    return;
                  }
                  if (balance != null && betAmount > balance) {
                    window.alert('Insufficient balance.');
                    return;
                  }
                  setLastResult(null);
                  setHasPlacedInitialBet(true);
                }
              }}
            />
            </div>
          </div>
          <div className="mt-3 hidden sm:flex flex-col gap-2">
            <button
              type="button"
              disabled={!canAdvance || topOption.disabled || isBetting || isCashingOut}
              onClick={() => {
                if (!canAdvance || topOption.disabled || isBetting || isCashingOut) return;
                setSelectedSide(topOption.key);
                doAdvance(topOption.key);
              }}
              className={cn(
                'flex h-10 w-full items-center justify-between rounded-md border px-3 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed bg-brand-stronger text-neutral-default border-neutral-weak/40'
              )}
            >
              <span>{topOption.label}</span>
              <span className="text-neutral-weak">
                {topOption.pct > 0 ? topOption.pct.toFixed(2) : '0.00'}%
              </span>
            </button>
            <button
              type="button"
              disabled={!canAdvance || bottomOption.disabled || isBetting || isCashingOut}
              onClick={() => {
                if (!canAdvance || bottomOption.disabled || isBetting || isCashingOut) return;
                setSelectedSide(bottomOption.key);
                doAdvance(bottomOption.key);
              }}
              className={cn(
                'flex h-10 w-full items-center justify-between rounded-md border px-3 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed bg-brand-stronger text-neutral-default border-neutral-weak/40'
              )}
            >
              <span>{bottomOption.label}</span>
              <span className="text-neutral-weak">
                {bottomOption.pct > 0 ? bottomOption.pct.toFixed(2) : '0.00'}%
              </span>
            </button>
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold text-neutral-weak mb-1">
              Total profit {activeRound ? '(accumulated)' : '(on win)'}
            </p>
            <div className="h-10 flex items-center rounded bg-input-disabled px-3 text-sm text-neutral-default shadow-md">
              $
              {totalProfitValue.toFixed(2)}
            </div>
            {authError && (
              <p className="mt-2 text-[11px] text-red-300">
                {authError}
              </p>
            )}
          </div>
        </div>

        <div className="relative flex-1 min-h-[320px] bg-brand-stronger flex flex-col items-center justify-center p-4 lg:p-8 gap-4">
          <div className="relative flex items-center justify-center mb-8 w-full max-w-2xl">
            {/* K = Highest (big screens only): card-style at left edge */}
            <div className="hidden sm:flex absolute left-2 sm:left-8 flex-col items-center gap-1.5 opacity-90">
              <Card rank="K" suit="S" className="h-16 w-12 pointer-events-none" />
              <div className="flex items-center gap-0.5 text-[10px] font-semibold text-neutral-weak">
                <ChevronUp className="h-2.5 w-2.5" />
                <span>Highest</span>
              </div>
            </div>
            {/* A = Lowest (big screens only): card-style at right edge */}
            <div className="hidden sm:flex absolute right-2 sm:right-8 flex-col items-center gap-1.5 opacity-90">
              <Card rank="A" suit="S" className="h-16 w-12 pointer-events-none" />
              <div className="flex items-center gap-0.5 text-[10px] font-semibold text-neutral-weak">
                <span>Lowest</span>
                <ChevronDown className="h-2.5 w-2.5" />
              </div>
            </div>

            <div className="flex w-full max-w-md items-center justify-center gap-0 sm:gap-8">
              {/* Center block: K+card | buttons+A (small screens); on sm+ only card shows */}
              <div className="flex items-center justify-center gap-4 sm:gap-0 shrink-0">
              {/* K + card with gap-2 (small screens); on sm+ only card shows */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={!canAdvance || topOption.disabled || isBetting || isCashingOut}
                  onClick={() => {
                    if (!canAdvance || topOption.disabled || isBetting || isCashingOut) return;
                    setSelectedSide(topOption.key);
                    doAdvance(topOption.key);
                  }}
                  className="h-32 flex flex-col items-center justify-center gap-0 text-[11px] font-semibold text-neutral-weak sm:hidden disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  <span className="shrink-0">K</span>
                  <ChevronUp className="h-3 w-3 shrink-0" />
                  <div className="w-px flex-1 min-h-[44px] bg-neutral-weak/80 shrink-0" aria-hidden />
                </button>
                <div className="relative flex items-center sm:block shrink-0">
                  <div className="relative inline-flex flex-col items-center justify-center">
                    {currentCard ? (
                      <>
                        {/* Stacked cards: blurred clones underneath */}
                        <Card
                          rank={RANK_LABELS[currentCard.rank]}
                          suit={
                            currentCard.suit === 'hearts'
                              ? 'H'
                              : currentCard.suit === 'diamonds'
                                ? 'D'
                                : currentCard.suit === 'clubs'
                                  ? 'C'
                                  : 'S'
                          }
                          className="pointer-events-none absolute z-0 h-32 w-24 translate-y-[10px] opacity-35 blur-[1px]"
                        />
                        <Card
                          rank={RANK_LABELS[currentCard.rank]}
                          suit={
                            currentCard.suit === 'hearts'
                              ? 'H'
                              : currentCard.suit === 'diamonds'
                                ? 'D'
                                : currentCard.suit === 'clubs'
                                  ? 'C'
                                  : 'S'
                          }
                          className="pointer-events-none absolute z-0 h-32 w-24 translate-y-[6px] opacity-55 blur-[0.5px]"
                        />
                        <Card
                          rank={RANK_LABELS[currentCard.rank]}
                          suit={
                            currentCard.suit === 'hearts'
                              ? 'H'
                              : currentCard.suit === 'diamonds'
                                ? 'D'
                                : currentCard.suit === 'clubs'
                                  ? 'C'
                                  : 'S'
                          }
                          className="pointer-events-none absolute z-0 h-32 w-24 translate-y-[3px] opacity-75"
                        />
                        <div
                          key={`${currentCard.rank}-${currentCard.suit}-${activeRound ? 'active' : 'start'}`}
                          className={cn(
                            'relative z-10 h-32 w-24 rounded-[13px] overflow-hidden',
                            !activeRound &&
                            !startCard &&
                            lastResult?.type === 'lose' &&
                            lastResult.displayCard &&
                            lastResult.displayCard.rank === currentCard.rank &&
                            lastResult.displayCard.suit === currentCard.suit &&
                            'border-4 border-red-500',
                            !activeRound &&
                            !startCard &&
                            lastResult?.type === 'cashout' &&
                            lastResult.displayCard &&
                            lastResult.displayCard.rank === currentCard.rank &&
                            lastResult.displayCard.suit === currentCard.suit &&
                            'border border-emerald-400'
                          )}
                        >
                          <Card
                            rank={RANK_LABELS[currentCard.rank]}
                            suit={
                              currentCard.suit === 'hearts'
                                ? 'H'
                                : currentCard.suit === 'diamonds'
                                  ? 'D'
                                  : currentCard.suit === 'clubs'
                                    ? 'C'
                                    : 'S'
                            }
                            className="h-full w-full"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="h-32 w-24 rounded-lg bg-brand-weaker/50 border-2 border-dashed border-neutral-weak/40" />
                    )}

                    {/* Skip is available any time there is a visible card and no request in flight.
                      Anchor it to the top-right of the card itself. */}
                    {!activeRound && currentCard && (
                      <button
                        type="button"
                        onClick={() => {
                          if (isSkipping) return;
                          // Reset local pre-bet state and fetch a fresh card
                          setHasPlacedInitialBet(false);
                          setLastResult(null);
                          fetchStartCard();
                        }}
                        disabled={isSkipping}
                        className="absolute -top-2 -right-2 z-20 rounded-full bg-brand-stronger px-2 py-1 shadow-md border border-neutral-weak/40 disabled:opacity-50 flex items-center justify-center gap-0.5"
                        title="Skip card"
                      >
                        <ChevronRight className="h-3 w-3 text-neutral-default" />
                        <ChevronRight className="h-3 w-3 text-neutral-default -ml-1" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Buttons + A with gap-2 (small screens only) */}
              <div className="flex items-center gap-2 sm:hidden shrink-0">
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={!canAdvance || topOption.disabled || isBetting || isCashingOut}
                    onClick={() => {
                      if (!canAdvance || topOption.disabled || isBetting || isCashingOut) return;
                      setSelectedSide(topOption.key);
                      doAdvance(topOption.key);
                    }}
                    className={cn(
                      'flex min-h-[64px] w-28 flex-col items-center justify-center gap-0.5 border-2 border-slate-400/50 px-3 py-2.5 text-xs font-semibold text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed',
                      'bg-amber-600/95 hover:bg-amber-500/95 active:bg-amber-700'
                    )}
                    style={{ clipPath: 'polygon(50% 0%, 100% 30%, 100% 100%, 0% 100%, 0% 30%)' }}
                  >
                    <span className="leading-tight">{topOption.label}</span>
                    <span className="text-slate-300 text-[10px]">
                      {topOption.pct > 0 ? topOption.pct.toFixed(2) : '0.00'}%
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={!canAdvance || bottomOption.disabled || isBetting || isCashingOut}
                    onClick={() => {
                      if (!canAdvance || bottomOption.disabled || isBetting || isCashingOut) return;
                      setSelectedSide(bottomOption.key);
                      doAdvance(bottomOption.key);
                    }}
                    className={cn(
                      'flex min-h-[64px] w-28 flex-col items-center justify-center gap-0.5 border-2 border-slate-400/50 px-3 py-2.5 text-xs font-semibold text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed',
                      'bg-violet-700/95 hover:bg-violet-600/95 active:bg-violet-800'
                    )}
                    style={{ clipPath: 'polygon(50% 100%, 100% 70%, 100% 0%, 0% 0%, 0% 70%)' }}
                  >
                    <span className="leading-tight">{bottomOption.label}</span>
                    <span className="text-slate-300 text-[10px]">
                      {bottomOption.pct > 0 ? bottomOption.pct.toFixed(2) : '0.00'}%
                    </span>
                  </button>
                </div>
                <button
                  type="button"
                  disabled={!canAdvance || bottomOption.disabled || isBetting || isCashingOut}
                  onClick={() => {
                    if (!canAdvance || bottomOption.disabled || isBetting || isCashingOut) return;
                    setSelectedSide(bottomOption.key);
                    doAdvance(bottomOption.key);
                  }}
                  className="h-32 flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-neutral-weak sm:hidden disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  <div className="w-px flex-1 min-h-[44px] bg-neutral-weak/80 shrink-0" aria-hidden />
                  <ChevronDown className="h-3 w-3 shrink-0" />
                  <span className="shrink-0">A</span>
                </button>
              </div>
              </div>
            </div>
          </div>

          <div className="w-full max-w-2xl px-4">
            <div className="grid grid-cols-2 gap-3 md:gap-4 bg-brand-weak/70 rounded-md px-4 py-3 md:px-6 md:py-4">
              <div>
                <p className="text-xs font-semibold text-neutral-weak mb-1">
                  Profit Higher ({multipliers.multiplierHigher.toFixed(2)}×)
                </p>
                <div className="h-10 flex items-center rounded border border-neutral-weak/40 bg-brand-stronger px-3 text-sm text-neutral-default shadow-sm">
                  ${profitHigher.toFixed(2)}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-weak mb-1">
                  Profit Lower ({multipliers.multiplierLower.toFixed(2)}×)
                </p>
                <div className="h-10 flex items-center rounded border border-neutral-weak/40 bg-brand-stronger px-3 text-sm text-neutral-default shadow-sm">
                  ${profitLower.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {roundCards.length > 0 && (
            <div className="mt-2 md:mt-4 w-full max-w-2xl px-3 md:px-4">
              <div className="flex items-end gap-3 overflow-x-auto pb-1 md:pb-2">
                {roundCards.map(({ card, cumulativeMultiplier }, idx) => (
                  <div
                    key={`${card.rank}-${card.suit}-${idx}`}
                    className="flex flex-col items-center gap-1 flex-none"
                  >
                    <Card
                      rank={RANK_LABELS[card.rank]}
                      suit={
                        card.suit === 'hearts'
                          ? 'H'
                          : card.suit === 'diamonds'
                            ? 'D'
                            : card.suit === 'clubs'
                              ? 'C'
                              : 'S'
                      }
                      className={cn(
                        'h-20 w-14',
                        idx === 0 && 'ring-2 ring-emerald-400/70'
                      )}
                    />
                    {idx === 0 ? (
                      <span className="mt-0.5 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-semibold text-black">
                        Start
                      </span>
                    ) : (
                      <div className="mt-0.5 w-full rounded-sm border border-emerald-500 bg-emerald-600/20 px-1 py-[2px] text-[10px] font-semibold text-emerald-300 text-center">
                        {cumulativeMultiplier.toFixed(2)}x
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {lastResult?.type === 'lose' && (
              <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
                <div className="pointer-events-auto rounded-lg border-2 border-red-500 bg-brand-stronger px-5 py-3 text-center shadow-2xl min-w-[180px]">
                  <p className="text-xl font-extrabold text-red-400">
                    0x
                  </p>
                  <div className="mt-1 h-px w-full bg-slate-700/80" />
                  <p className="mt-1 text-sm font-semibold text-red-200">
                    $0.00
                  </p>
                </div>
              </div>
            )}

          {lastResult?.type === 'cashout' &&
            lastResult.payout != null &&
            lastResult.multiplier != null &&
            lastResult.stake != null && (
              <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
                <div className="pointer-events-auto rounded-lg border-2 border-emerald-500 bg-brand-stronger px-5 py-3 text-center shadow-2xl min-w-[180px]">
                  <p className="text-xl font-extrabold text-emerald-400">
                    {lastResult.multiplier.toFixed(3)}x
                  </p>
                  <div className="mt-1 h-px w-full bg-slate-700/80" />
                  <p className="mt-1 text-sm font-semibold text-emerald-200">
                    ${(lastResult.stake * lastResult.multiplier).toFixed(2)}
                  </p>
                </div>
              </div>
            )}
        </div>
        {/* End flex row wrapper */}
      </div>
      <GameSettingsBar game={Games.HILO} />
      <GameDescriptionAccordion game={Games.HILO} />
    </div>
  );
}
