import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Player } from '@lottiefiles/react-lottie-player';

import {
  startChickenRoad,
  crossChickenRoad,
  cashOutChickenRoad,
  getActiveChickenRoad,
} from '@/api/games/chicken-road';
import type { ChickenRoadRoundResult } from '@/api/games/chicken-road';
import { RTP } from '@repo/common/game-utils/chicken-road/constants.js';
import type {
  ChickenRoadGameOverResponse,
  ChickenRoadPlayRoundResponse,
} from '@repo/common/game-utils/chicken-road/types.js';
import CommonSelect from '@/components/ui/common-select';
import { BetAmountInput } from '@/features/games/common/components/BetAmountInput';
import { BetButton } from '@/features/games/common/components/BettingControls';
import GameSettingsBar from '@/features/games/common/components/game-settings';
import GameDescriptionAccordion from '@/features/games/common/components/GameDescriptionAccordion';
import { useBalance } from '@/hooks/useBalance';
import { Games } from '@/const/games';
import { cn } from '@/lib/utils';

import { RocketTrack } from './components/RocketTrack';
import { useChickenRoadStore } from './store/chickenRoadStore';

const SPACE_JSON = '/games/rocket/space.json';

function isPlayResponse(data: ChickenRoadRoundResult): data is ChickenRoadPlayRoundResponse {
  return data.active === true;
}

export default function ChickenRoad(): JSX.Element {
  const queryClient = useQueryClient();
  const { gameState, setGameState, betAmount, setBetAmount, difficulty, setDifficulty } =
    useChickenRoadStore();
  const balance = useBalance();
  const [stickyGameOver, setStickyGameOver] = useState<ChickenRoadGameOverResponse | null>(null);
  /** Delay crash overlay until after meteoroid-hit animation (~800ms) */
  const [showCrashOverlay, setShowCrashOverlay] = useState(false);
  /** Next lane clear of meteoroid (set by RocketTrack); when false and user clicked Advance we delay the request */
  const [canAdvance, setCanAdvance] = useState(true);
  /** User clicked Advance while lane was busy; we'll call cross() when canAdvance becomes true */
  const [pendingAdvance, setPendingAdvance] = useState(false);

  const { data: activeGame, isSuccess: hasFetchedActive } = useQuery({
    queryKey: ['chicken-road-active'],
    queryFn: getActiveChickenRoad,
    retry: false,
  });

  useEffect(() => {
    if (hasFetchedActive && activeGame?.data) {
      setGameState(activeGame.data);
      setBetAmount(Number(activeGame.data.betAmount ?? 0));
      if (activeGame.data.difficulty != null) setDifficulty(activeGame.data.difficulty);
      // There is an active game on the server; clear any previous game-over banner.
      setStickyGameOver(null);
    } else if (hasFetchedActive && !activeGame?.data) {
      setGameState(null);
    }
  }, [activeGame, hasFetchedActive, setGameState, setBetAmount, setDifficulty]);

  const getErrorMessage = (error: unknown): string => {
    if (error && typeof error === 'object') {
      const err = error as {
        message?: string;
        graphQLErrors?: { message?: string }[];
        response?: { data?: { message?: string } };
      };
      if (err.graphQLErrors?.[0]?.message) return err.graphQLErrors[0].message;
      if (err.response?.data?.message) return err.response.data.message;
      if (typeof err.message === 'string') return err.message;
    }
    return 'Something went wrong. Please try again.';
  };

  const { mutate: start, isPending: isStarting } = useMutation({
    mutationKey: ['chicken-road-start'],
    mutationFn: () => startChickenRoad(betAmount, difficulty),
    onSuccess: ({ data }) => {
      setGameState(data);
      setStickyGameOver(null);
      setBetAmount(Number(data.betAmount));
      if (data.difficulty != null) setDifficulty(data.difficulty);
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      queryClient.invalidateQueries({ queryKey: ['chicken-road-active'] });
    },
    onError: (error: unknown) => {
      // eslint-disable-next-line no-alert -- intentional user-facing error feedback
      window.alert(getErrorMessage(error));
    },
  });

  const { mutate: cross, isPending: isCrossing } = useMutation({
    mutationKey: ['chicken-road-cross'],
    mutationFn: crossChickenRoad,
    onSuccess: ({ data }) => {
      setGameState(data);
      if (!data.active && 'payout' in data) {
        setStickyGameOver(data as ChickenRoadGameOverResponse);
      } else {
        setStickyGameOver(null);
      }
      if (data.active && isPlayResponse(data) && data.difficulty != null) {
        setDifficulty(data.difficulty);
      }
      if (!data.active && 'balance' in data) {
        queryClient.setQueryData(['balance'], () => data.balance);
      }
      queryClient.invalidateQueries({ queryKey: ['chicken-road-active'] });
    },
    onError: (error: unknown) => {
      // eslint-disable-next-line no-alert -- intentional user-facing error feedback
      window.alert(getErrorMessage(error));
    },
  });

  const { mutate: cashOut, isPending: isCashingOut } = useMutation({
    mutationKey: ['chicken-road-cashout'],
    mutationFn: cashOutChickenRoad,
    onSuccess: ({ data }) => {
      setGameState(data);
      setStickyGameOver(data);
      queryClient.setQueryData(['balance'], () => data.balance);
      queryClient.invalidateQueries({ queryKey: ['chicken-road-active'] });
    },
    onError: (error: unknown) => {
      // eslint-disable-next-line no-alert -- intentional user-facing error feedback
      window.alert(getErrorMessage(error));
    },
  });

  const effectiveState = gameState ?? stickyGameOver;

  const isActive = effectiveState?.active === true;
  const isOver = effectiveState?.active === false;
  const currentMultiplier =
    effectiveState && isPlayResponse(effectiveState) ? effectiveState.currentMultiplier : 1;
  const hopsCompleted =
    effectiveState && isPlayResponse(effectiveState)
      ? effectiveState.hopsCompleted
      : effectiveState && 'state' in effectiveState && effectiveState.state?.hopsCompleted != null
        ? effectiveState.state.hopsCompleted
        : 0;
  const gameOverResponse =
    isOver && effectiveState && 'payout' in effectiveState ? effectiveState : null;
  const crashedAtHop = gameOverResponse?.crashedAtHop;
  const isPending = isStarting || isCrossing || isCashingOut;
  const DISPLAY_HOUSE_EDGE = 1 - RTP;

  // Show crash overlay only after meteoroid-hit animation (800ms); cash-out shows immediately
  useEffect(() => {
    if (!gameOverResponse) {
      setShowCrashOverlay(false);
      return;
    }
    if (crashedAtHop == null) {
      setShowCrashOverlay(true);
      return;
    }
    setShowCrashOverlay(false);
    const t = setTimeout(() => setShowCrashOverlay(true), 800);
    return () => clearTimeout(t);
  }, [gameOverResponse, crashedAtHop]);
  const isDisabled =
    betAmount <= 0 || (balance != null && betAmount > balance);

  const gamePanelRef = useRef<HTMLDivElement>(null);
  const [panelSize, setPanelSize] = useState({ width: 400, height: 400 });

  useLayoutEffect(() => {
    const el = gamePanelRef.current;
    if (!el) return;
    const setSize = (): void => {
      setPanelSize({ width: el.clientWidth, height: el.clientHeight });
    };
    setSize();
    const ro = new ResizeObserver(setSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // When user clicked Advance but lane was busy, send the request as soon as lane is clear
  useEffect(() => {
    if (!isActive) {
      setPendingAdvance(false);
      return;
    }
    if (pendingAdvance && canAdvance && !isPending) {
      setPendingAdvance(false);
      cross();
    }
  }, [pendingAdvance, canAdvance, isActive, isPending]);

  return (
    <>
      <div className="flex flex-col-reverse lg:flex-row w-full items-stretch mx-auto rounded-t-md overflow-hidden shadow-md">
        <div className="bg-brand-weak flex flex-col gap-4 p-3 w-full lg:w-1/4">
          <BetAmountInput
            betAmount={betAmount}
            isInputDisabled={isActive}
            onBetAmountChange={(amount, mult = 1) => {
              if (!isActive) setBetAmount(amount * mult);
            }}
          />
          <div className={cn(isActive && 'pointer-events-none opacity-70')}>
            <CommonSelect
              label="Difficulty"
              labelClassName="font-semibold"
              onValueChange={(value) => setDifficulty(value as typeof difficulty)}
              options={[
                { label: 'Easy (1 trap)', value: 'easy' },
                { label: 'Medium (3 traps)', value: 'medium' },
                { label: 'Hard (5 traps)', value: 'hard' },
                { label: 'Expert (10 traps)', value: 'expert' },
              ]}
              triggerClassName="h-10 text-sm font-medium bg-brand-stronger"
              value={difficulty}
            />
          </div>
          {isActive ? (
            <div className="flex flex-col gap-2">
              <div className="text-xs text-neutral-weak font-medium">
                Multiplier:{' '}
                <span className="text-neutral-default font-semibold">
                  {(currentMultiplier / RTP - DISPLAY_HOUSE_EDGE).toFixed(2)}x
                </span>
              </div>
              <div className="text-xs text-neutral-weak font-medium">
                Steps: <span className="text-neutral-default font-semibold">{hopsCompleted}</span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <BetButton
                    betButtonText="Advance"
                    disabled={isPending}
                    isPending={isCrossing}
                    loadingImage="/games/dice/loading-dice.png"
                    onClick={() => {
                      if (canAdvance) cross();
                      else setPendingAdvance(true);
                    }}
                  />
                  <BetButton
                    betButtonText="Cash out"
                    disabled={isPending || currentMultiplier <= 1}
                    isPending={isCashingOut}
                    loadingImage="/games/dice/loading-dice.png"
                    onClick={() => cashOut()}
                  />
                </div>
              </div>
            </div>
          ) : (
            <BetButton
              disabled={isDisabled || isPending}
              isPending={isStarting}
              loadingImage="/games/dice/loading-dice.png"
              onClick={() => {
                // Immediately reset UI to the initial rocket position before starting a new round
                setStickyGameOver(null);
                setGameState(null);
                start();
              }}
            />
          )}
        </div>
        <div
          ref={gamePanelRef}
          className="flex-1 min-h-[260px] lg:min-h-[320px] relative flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Space background: cover entire panel (no letterboxing / dark bars on sides) */}
          <div
            className="absolute inset-0 z-0 pointer-events-none overflow-hidden"
            aria-hidden
          >
            <Player
              autoplay
              loop
              src={SPACE_JSON}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: Math.max(panelSize.width, panelSize.height),
                height: Math.max(panelSize.width, panelSize.height),
                minWidth: panelSize.width,
                minHeight: panelSize.height,
              }}
            />
          </div>
          <div className="relative z-[1] w-full px-4 py-0 lg:px-24 lg:py-6 flex flex-col items-center justify-center flex-1">
          <RocketTrack
            difficulty={difficulty}
            currentStep={
              isOver && crashedAtHop != null ? crashedAtHop : hopsCompleted
            }
            exploded={Boolean(isOver && crashedAtHop != null)}
            hasStarted={isActive || isOver}
            betAmount={betAmount}
            onCanAdvanceChange={setCanAdvance}
            pendingAdvance={pendingAdvance}
          />
          </div>
          {gameOverResponse && (crashedAtHop == null || showCrashOverlay) && (
            <div
              className={cn(
                'absolute inset-0 z-[2] flex flex-col items-center justify-center bg-brand-stronger/95 rounded-lg',
                crashedAtHop != null ? 'text-red-500' : 'text-[#00e600]'
              )}
            >
              <p className="text-xl font-bold">
                {crashedAtHop != null ? 'Exploded!' : 'Cashed out'}
              </p>
              <p className="text-2xl font-bold mt-1">
                {crashedAtHop != null ? '0' : gameOverResponse.payout?.toFixed(2)} USD
              </p>
            </div>
          )}
        </div>
      </div>
      <GameSettingsBar game={Games.CHICKEN_ROAD} />
      <GameDescriptionAccordion game={Games.CHICKEN_ROAD} />
    </>
  );
}
