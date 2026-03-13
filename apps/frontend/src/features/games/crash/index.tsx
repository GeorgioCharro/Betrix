import { useEffect, useMemo, useRef, useState } from 'react';

import { Games } from '@/const/games';
import GameSettingsBar from '@/features/games/common/components/game-settings';
import GameDescriptionAccordion from '@/features/games/common/components/GameDescriptionAccordion';
import { BASE_API_URL } from '@/const/routes';
import { useAuthStore } from '@/features/auth/store/authStore';
import { cn } from '@/lib/utils';

import { BetPanel } from './BetPanel';
import { MultiplierDisplay } from './MultiplierDisplay';
import { CrashGraph } from './CrashGraph';

type RoundState = 'WAITING' | 'RUNNING' | 'CRASHED';

interface BetsInfo {
  players: number;
  totalBet: number;
}

interface CrashMessage {
  type: string;
  state?: RoundState;
  waitingMs?: number;
  nextHash?: string;
  multiplier?: number;
  players?: number;
  totalBet?: number;
  ok?: boolean;
  error?: string;
  payout?: number;
  history?: {
    crashMultiplier: number;
    hash: string;
    nonce: number;
    timestamp: number;
    clientSeed: string;
    serverSeedHash: string;
  }[];
  roundStartTime?: number;
  growthRate?: number;
}

export function Crash(): JSX.Element {
  const { user } = useAuthStore();
  const [roundState, setRoundState] = useState<RoundState>('WAITING');
  const [currentMultiplier, setCurrentMultiplier] = useState(1);
  const [betsInfo, setBetsInfo] = useState<BetsInfo>({ players: 0, totalBet: 0 });
  const [waitingMs, setWaitingMs] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState(1);
  const [cashoutAt, setCashoutAt] = useState(2);
  const [betActive, setBetActive] = useState(false);
  const [betQueued, setBetQueued] = useState(false);
  const [lastCashout, setLastCashout] = useState<{ payout: number; multiplier: number } | null>(
    null,
  );
  const [history, setHistory] = useState<
    {
      crashMultiplier: number;
      hash: string;
      nonce: number;
      timestamp: number;
      clientSeed: string;
      serverSeedHash: string;
    }[]
  >([]);

  const wsRef = useRef<WebSocket | null>(null);
  const pointsRef = useRef<{ t: number; m: number }[]>([{ t: 0, m: 1 }]);
  const startTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const growthRateRef = useRef<number>(0.085);
  const waitingStartRef = useRef<number | null>(null);
  const [waitingSecondsLeft, setWaitingSecondsLeft] = useState<number | null>(null);
  const betActiveRef = useRef(false);
  const betQueuedRef = useRef(false);

  useEffect(() => {
    if (!user) return;

    const base = new URL(BASE_API_URL);
    const protocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${base.host}?userId=${encodeURIComponent(user.id)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = evt => {
      if (typeof evt.data !== 'string') return;
      let parsed: CrashMessage;
      try {
        parsed = JSON.parse(evt.data);
      } catch {
        return;
      }
      switch (parsed.type) {
        case 'crash:state_snapshot': {
          if (parsed.state) {
            setRoundState(parsed.state);
          }

          if (Array.isArray(parsed.history)) {
            setHistory(parsed.history);
          }

          if (parsed.state === 'WAITING') {
            setWaitingMs(parsed.waitingMs ?? null);
            waitingStartRef.current = performance.now();
            if (typeof parsed.waitingMs === 'number') {
              setWaitingSecondsLeft(Math.ceil(parsed.waitingMs / 1000));
            } else {
              setWaitingSecondsLeft(null);
            }
            setCurrentMultiplier(1);
            pointsRef.current = [{ t: 0, m: 1 }];
            startTimeRef.current = null;
          }

          if (parsed.state === 'RUNNING' && typeof parsed.roundStartTime === 'number') {
            const now = Date.now();
            const ageMs = Math.max(0, now - parsed.roundStartTime);
            const ageSec = ageMs / 1000;

            const effectiveGrowthRate =
              typeof parsed.growthRate === 'number' ? parsed.growthRate : growthRateRef.current;

            const computeMultiplier = (tSec: number) => {
              const raw = Math.exp(effectiveGrowthRate * tSec);
              return Math.max(1.0, Math.floor(raw * 100) / 100);
            };

            const points: { t: number; m: number }[] = [];
            const step = ageSec > 0 ? Math.max(0.05, ageSec / 60) : 0.05;

            for (let t = 0; t <= ageSec; t += step) {
              points.push({ t, m: computeMultiplier(t) });
            }

            const current = computeMultiplier(ageSec);
            points.push({ t: ageSec, m: current });

            pointsRef.current = points;
            setCurrentMultiplier(current);

            if (typeof parsed.growthRate === 'number') {
              growthRateRef.current = parsed.growthRate;
            }

            startTimeRef.current = performance.now() - ageMs;
          }

          break;
        }
        case 'crash:round_state':
          if (parsed.state) setRoundState(parsed.state);
          setWaitingMs(parsed.waitingMs ?? null);
          waitingStartRef.current = performance.now();
          if (typeof parsed.waitingMs === 'number') {
            setWaitingSecondsLeft(Math.ceil(parsed.waitingMs / 1000));
          } else {
            setWaitingSecondsLeft(null);
          }
          setCurrentMultiplier(1);
          pointsRef.current = [{ t: 0, m: 1 }];
          startTimeRef.current = null;
          setBetActive(false);
          betActiveRef.current = false;
          break;
        case 'crash:round_start':
          setRoundState('RUNNING');
          setCurrentMultiplier(1);
          setLastCashout(null);
          startTimeRef.current = performance.now();
          if (betQueuedRef.current) {
            setBetActive(true);
            betActiveRef.current = true;
            setBetQueued(false);
            betQueuedRef.current = false;
          }
          if (typeof parsed.growthRate === 'number') {
            growthRateRef.current = parsed.growthRate;
          }
          break;
        case 'crash:crashed':
          if (typeof parsed.multiplier === 'number') {
            setRoundState('CRASHED');
            setCurrentMultiplier(parsed.multiplier);
          }
          setBetActive(false);
          betActiveRef.current = false;
          break;
        case 'crash:bets_update':
          setBetsInfo({
            players: parsed.players ?? 0,
            totalBet: parsed.totalBet ?? 0,
          });
          break;
        case 'crash:place_bet_result': {
          if (!parsed.ok) {
            setBetActive(false);
            betActiveRef.current = false;
            setBetQueued(false);
            betQueuedRef.current = false;
            break;
          }

          if (parsed.queued) {
            setBetQueued(true);
            betQueuedRef.current = true;
            setBetActive(false);
            betActiveRef.current = false;
          } else {
            setBetActive(true);
            betActiveRef.current = true;
            setBetQueued(false);
            betQueuedRef.current = false;
          }

          break;
        }
        case 'crash:cashout_result':
          if (parsed.ok && typeof parsed.payout === 'number') {
            const effectiveMultiplier =
              typeof parsed.multiplier === 'number' ? parsed.multiplier : currentMultiplier;
            setLastCashout({ payout: parsed.payout, multiplier: effectiveMultiplier });
            setBetActive(false);
            betActiveRef.current = false;
          }
          break;
        case 'crash:history_update':
          if (Array.isArray(parsed.history)) {
            setHistory(parsed.history);
          }
          break;
        default:
          break;
      }
    };

    return () => {
      ws.close();
    };
  }, [user]);

  useEffect(() => {
    if (roundState !== 'RUNNING') {
      if (animFrameRef.current != null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    if (startTimeRef.current == null) {
      startTimeRef.current = performance.now();
    }

    const loop = () => {
      if (roundState !== 'RUNNING' || startTimeRef.current == null) {
        return;
      }

      const elapsedSec = (performance.now() - startTimeRef.current) / 1000;
      const raw = Math.exp(growthRateRef.current * elapsedSec);
      const multiplier = Math.max(1.0, Math.floor(raw * 100) / 100);

      setCurrentMultiplier(multiplier);

      const t = elapsedSec;
      pointsRef.current.push({ t, m: multiplier });

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current != null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [roundState]);

  useEffect(() => {
    if (roundState !== 'WAITING' || waitingMs == null) {
      setWaitingSecondsLeft(null);
      return;
    }

    if (waitingStartRef.current == null) {
      waitingStartRef.current = performance.now();
    }

    let frame: number;
    const loop = () => {
      if (roundState !== 'WAITING' || waitingMs == null || waitingStartRef.current == null) {
        return;
      }

      const elapsedMs = performance.now() - waitingStartRef.current;
      const remainingMs = Math.max(0, waitingMs - elapsedMs);
      const remainingSeconds = Math.ceil(remainingMs / 1000);
      setWaitingSecondsLeft(remainingSeconds);

      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);

    return () => {
      if (frame != null) {
        cancelAnimationFrame(frame);
      }
    };
  }, [roundState, waitingMs]);

  const handlePlaceBet = () => {
    if (!wsRef.current) return;
    if (cashoutAt < 1.01) return;
    wsRef.current.send(
      JSON.stringify({ type: 'crash:place_bet', amount: betAmount, cashoutAt }),
    );
  };

  const handleCashout = () => {
    if (!wsRef.current) return;
    wsRef.current.send(JSON.stringify({ type: 'crash:cashout' }));
  };

  const canCashout = roundState === 'RUNNING' && betActive && currentMultiplier >= 1.0;
  const currentReturn =
    betActive && roundState === 'RUNNING' ? betAmount * currentMultiplier : 0;
  const formattedReturn = currentReturn.toFixed(2);

  const graphPoints = useMemo(
    () => pointsRef.current.slice(),
    [currentMultiplier, roundState],
  );

  return (
    <div className="relative w-full">
      <div className="flex flex-col-reverse lg:flex-row w-full items-stretch mx-auto rounded-t-md overflow-hidden shadow-md bg-slate-900 text-slate-50">
        {/* Left panel */}
        <div className="bg-slate-900/90 flex flex-col gap-4 p-3 w-full lg:w-1/4 border-r border-slate-800">
          <BetPanel
            betAmount={betAmount}
            setBetAmount={setBetAmount}
            cashoutAt={cashoutAt}
            setCashoutAt={setCashoutAt}
            roundState={roundState}
            onPlaceBet={handlePlaceBet}
            betActive={betActive}
            betQueued={betQueued}
            profitOnWin={betAmount * (cashoutAt - 1)}
            players={betsInfo.players}
            totalBet={betsInfo.totalBet}
          />
        </div>

        {/* Main area */}
        <div className="relative flex-1 min-h-[320px] bg-slate-950 flex flex-col items-center justify-center p-4 lg:p-8 gap-4">
          <MultiplierDisplay
            multiplier={currentMultiplier}
            state={roundState}
            canCashout={canCashout}
            onCashout={handleCashout}
            lastCashout={lastCashout}
            waitingSecondsLeft={waitingSecondsLeft}
            currentReturn={formattedReturn}
          />
          <CrashGraph state={roundState} multiplier={currentMultiplier} points={graphPoints} />
          {history.length > 0 && (
            <div className="w-full px-4 pt-3">
              <div className="flex w-full flex-nowrap items-center justify-end gap-2 min-h-8">
                {history.slice(0, 6).map(h => (
                  <span
                    key={`${h.nonce}-${h.timestamp}`}
                    className={cn(
                      'text-white p-2 rounded-full w-16 text-center text-xs font-semibold shrink-0',
                      h.crashMultiplier >= 2 ? 'bg-[#00e600] text-black' : 'bg-secondary-light',
                    )}
                  >
                    {h.crashMultiplier.toFixed(2)}x
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <GameSettingsBar game={Games.CRASH} />
      <GameDescriptionAccordion game={Games.CRASH} />
    </div>
  );
}

