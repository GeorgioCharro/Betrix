import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { MULTIPLIER_TABLES, RTP } from '@repo/common/game-utils/chicken-road/constants.js';
import type { ChickenRoadDifficulty } from '@repo/common/game-utils/chicken-road/constants.js';
import { Player } from '@lottiefiles/react-lottie-player';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const ROCKET_IMAGE = '/games/rocket/rocket.png';
const ROCKET_BASE_IMAGE = '/games/rocket/rocket_base.png';
const METEOROID_IMAGE = '/games/rocket/meteoroid.png';
const EXPLOSION_JSON = '/games/rocket/explosion.json';

/** Size of meteoroid sprite in track lanes + hit (px) */
const METEOROID_SIZE = 32;

/** Full cycle duration (seconds) - must match CSS .rocket-meteoroid-pass (8s) */
const METEOROID_CYCLE_DURATION = 8;

/** Meteoroid is visible/crossing during the first 1s of each cycle */
const METEOROID_VISIBLE_DURATION = 1;

/** Within the visible pass, danger zone (rocket column) is this phase range (seconds) */
const METEOROID_DANGER_PHASE_START = 0.2;
const METEOROID_DANGER_PHASE_END = 0.5;

/** Meteoroid lane starts after the multiplier box so meteoroids never overlap the multiplier text */
const METEOROID_LANE_LEFT_PX = 92;

/** No meteoroid appears in the first this many seconds after round start */
const METEOROID_GRACE_PERIOD_S = 2;

/** Extra gap below the 1.0x row so the rocket/base sit lower and the distance to the next multiplier is clearer */
const ROCKET_BASE_GAP_BELOW_1X = 48;

/** Responsive rocket/base sizes from window width (Tailwind breakpoints: sm 640, md 768, lg 1024, xl 1280) */
function getSizesFromWidth(width: number): { rocketSize: number; baseHeight: number } {
  if (width >= 1280) return { rocketSize: 128, baseHeight: 90 };
  if (width >= 1024) return { rocketSize: 116, baseHeight: 80 };
  if (width >= 768) return { rocketSize: 96, baseHeight: 68 };
  if (width >= 640) return { rocketSize: 84, baseHeight: 58 };
  return { rocketSize: 76, baseHeight: 54 };
}

/** Step 0 = 1.0x (100% chance), step 1+ = table row multiplier and reach probability */
function getRowsForDifficulty(
  difficulty: ChickenRoadDifficulty
): { multiplier: number; reachProbability: number }[] {
  const table = MULTIPLIER_TABLES[difficulty];
  return [{ multiplier: 1, reachProbability: 1 }, ...table];
}

// Displayed multipliers: start from the fair value (house edge removed),
// then subtract the 2% edge so the 1.0x row shows as exactly 1.00x.
const DISPLAY_HOUSE_EDGE = 1 - RTP;

export interface RocketTrackProps {
  difficulty: ChickenRoadDifficulty;
  /** Current step (0-based). When crashed, pass the step where it exploded. */
  currentStep: number;
  /** True when the round ended in a crash (rocket explodes). */
  exploded: boolean;
  /** True when a round is active or we're showing a result (show rocket/explosion). */
  hasStarted: boolean;
  /** Bet amount (used for Profit on Win per row). */
  betAmount: number;
  /** Called when "can advance" changes (next lane has no meteoroid in danger zone). Used to send delayed advance request. */
  onCanAdvanceChange?: (canAdvance: boolean) => void;
  /** When true, advance was requested but delayed; hide meteoroid in the next lane so rocket doesn't appear to hit it. */
  pendingAdvance?: boolean;
}

export function RocketTrack({
  difficulty,
  currentStep,
  exploded,
  hasStarted,
  betAmount,
  onCanAdvanceChange,
  pendingAdvance = false,
}: RocketTrackProps): JSX.Element {
  const rows = getRowsForDifficulty(difficulty);
  const multipliers = rows.map((r) => r.multiplier);
  const activeNodeRef = useRef<HTMLDivElement | null>(null);
  const firstRowRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const prevHasStartedRef = useRef<boolean>(false);
  const roundStartTimeRef = useRef<number>(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const [roundId, setRoundId] = useState(0);
  const [meteoroidsEnabled, setMeteoroidsEnabled] = useState(false);
  const [rocketTop, setRocketTop] = useState(0);
  const [baseTop, setBaseTop] = useState(0);
  const [initialRocketTop, setInitialRocketTop] = useState(0);
  const [crashFlameTop, setCrashFlameTop] = useState(0);
  const [showFlameAfterHit, setShowFlameAfterHit] = useState(false);
  const [sizes, setSizes] = useState(() => getSizesFromWidth(typeof window !== 'undefined' ? window.innerWidth : 1024));
  const { rocketSize, baseHeight } = sizes;
  // Vertical padding per multiplier row; slightly tighter on smaller screens so the rocket fits more evenly between lanes
  const rowPaddingY = useMemo(() => {
    if (rocketSize >= 116) return 44;
    if (rocketSize >= 96) return 40;
    if (rocketSize >= 84) return 36;
    return 32;
  }, [rocketSize]);
  // When a new round starts: record time, bump roundId; enable meteoroids only after 1s so new round = no meteoroids at start
  useEffect(() => {
    if (!hasStarted) {
      setMeteoroidsEnabled(false);
      return;
    }
    if (!prevHasStartedRef.current) {
      prevHasStartedRef.current = true;
      roundStartTimeRef.current = performance.now();
      setRoundId((r) => r + 1);
      setMeteoroidsEnabled(false);
      const t = setTimeout(() => setMeteoroidsEnabled(true), 1000);
      return () => clearTimeout(t);
    }
  }, [hasStarted]);

  /** Per-lane: random spawn delay (grace period..cycle); regenerated on new bet, crash, or difficulty change */
  const meteoroidDelays = useMemo(
    () =>
      multipliers.map(
        () => METEOROID_GRACE_PERIOD_S + Math.random() * (METEOROID_CYCLE_DURATION - METEOROID_GRACE_PERIOD_S)
      ),
    [multipliers.length, roundId, difficulty]
  );

  /** Is there a meteoroid in the danger zone in lane `laneIndex` at time `t` (seconds since round start)? */
  const isLaneDangerousAt = (laneIndex: number, t: number): boolean => {
    const delay = meteoroidDelays[laneIndex] ?? 0;
    const elapsed = t - delay;
    if (elapsed < 0) return false;
    const phase = elapsed % METEOROID_CYCLE_DURATION;
    if (phase >= METEOROID_VISIBLE_DURATION) return false;
    return phase >= METEOROID_DANGER_PHASE_START && phase <= METEOROID_DANGER_PHASE_END;
  };

  // On crash: meteoroid hits (0.35s), then meteoroid disappears and we show flame + hide rocket
  useEffect(() => {
    if (!exploded || currentStep === 0) {
      setShowFlameAfterHit(false);
      return;
    }
    setShowFlameAfterHit(false);
    const t = setTimeout(() => setShowFlameAfterHit(true), 350);
    return () => clearTimeout(t);
  }, [exploded, currentStep]);

  // Update sizes on resize (match Tailwind breakpoints)
  useEffect(() => {
    const onResize = (): void => {
      setSizes(getSizesFromWidth(window.innerWidth));
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Base sits below the 1.0x row (with ROCKET_BASE_GAP_BELOW_1X) so the rocket is clearly at 1.0x with a visible gap to the next multiplier.
  useLayoutEffect(() => {
    const firstRow = firstRowRef.current;
    if (!firstRow) return;
    const rowBottom = firstRow.offsetTop + firstRow.offsetHeight;
    const baseY = rowBottom - baseHeight + ROCKET_BASE_GAP_BELOW_1X;
    setBaseTop(baseY);
    const overlap = Math.round(rocketSize * 0.45); // overlap rocket onto base so they touch visually
    setInitialRocketTop(baseY - rocketSize + overlap);
  }, [multipliers.length, rocketSize, baseHeight]);

  // Rocket position: during crash hit phase keep rocket at crash row; then at base; else at active row
  useLayoutEffect(() => {
    if (exploded && currentStep > 0 && !showFlameAfterHit) {
      setRocketTop(crashFlameTop);
      return;
    }
    const atInitial = currentStep === 0 || exploded;
    if (atInitial) {
      setRocketTop(initialRocketTop);
      return;
    }
    const row = activeNodeRef.current;
    if (!row) return;
    const top = row.offsetTop + row.offsetHeight / 2 - rocketSize / 2;
    setRocketTop(top);
  }, [currentStep, hasStarted, exploded, showFlameAfterHit, initialRocketTop, rocketSize, crashFlameTop]);

  // Flame position when crashed (at the row where it exploded)
  useLayoutEffect(() => {
    if (!exploded || currentStep === 0) return;
    const row = activeNodeRef.current;
    if (!row) return;
    const top = row.offsetTop + row.offsetHeight / 2 - rocketSize / 2;
    setCrashFlameTop(top);
  }, [exploded, currentStep, rocketSize]);

  // Keep rocket in view when step changes (not when at step 0)
  useEffect(() => {
    if (!hasStarted || currentStep === 0) return;
    activeNodeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentStep, hasStarted]);

  // When a round finishes (hasStarted true -> false), scroll back to 1.0x and clear the ref.
  useEffect(() => {
    const prev = prevHasStartedRef.current;
    if (prev && !hasStarted) {
      prevHasStartedRef.current = false;
      const container = scrollContainerRef.current;
      if (container) {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      }
    }
  }, [hasStarted]);

  // Poll: can the player advance? (next lane has no meteoroid in danger zone). Notify parent.
  useEffect(() => {
    if (!onCanAdvanceChange) return;
    const nextLane = currentStep + 1;
    if (nextLane >= multipliers.length || !hasStarted || exploded) {
      onCanAdvanceChange(true);
      return;
    }
    const tick = (): void => {
      const t = (performance.now() - roundStartTimeRef.current) / 1000;
      const dangerous = isLaneDangerousAt(nextLane, t);
      onCanAdvanceChange(!dangerous);
    };
    tick();
    const interval = setInterval(tick, 150);
    return () => clearInterval(interval);
  }, [onCanAdvanceChange, currentStep, multipliers.length, hasStarted, exploded, meteoroidDelays]);

  return (
    <div className="flex flex-col items-center w-full max-w-[280px] sm:max-w-[340px] md:max-w-[400px] lg:max-w-[480px] mx-auto py-0 lg:py-2 flex-1 min-h-0">
      {/* Scrollable track (no scrollbar); multipliers on left, rocket column on right */}
      <div
        ref={scrollContainerRef}
        className="relative w-full overflow-y-auto overflow-x-hidden overscroll-contain max-h-[260px] sm:max-h-[320px] md:max-h-[380px] lg:max-h-[420px] min-h-[200px] rounded-lg scroll-smooth no-scrollbar"
      >
        {/* Full list: bottom = 1.0x (index 0), top = highest. flex-col-reverse so first child is at bottom. */}
        <div
          ref={contentRef}
          className="relative flex flex-col-reverse gap-0 pt-0 lg:pt-2"
          style={{ paddingBottom: 16 + ROCKET_BASE_GAP_BELOW_1X }}
        >
          {/* Horizontal lane borders: thicker dashes with visible gaps between them */}
          <div
            className="absolute left-0 right-0 top-0 z-[1] pointer-events-none"
            style={{
              height: 2,
              background: 'repeating-linear-gradient(to right, rgba(177,180,211,0.55) 0px, rgba(177,180,211,0.55) 10px, transparent 10px, transparent 32px)',
            }}
            aria-hidden
          />
          {/* Vertical line through center of multiplier column */}
          <div
            className="absolute left-9 top-0 bottom-0 w-0.5 -translate-x-px bg-neutral-weak/60 rounded-full z-0 pointer-events-none"
            aria-hidden
          />
          {/* Base: fixed at bottom right (1.0x row), always visible; size responsive to screen */}
          <div
            className="absolute right-0 z-[1] flex items-end justify-center pointer-events-none"
            style={{ top: baseTop, width: rocketSize + 8, height: baseHeight }}
            aria-hidden
          >
            <img
              src={ROCKET_BASE_IMAGE}
              alt=""
              className="w-full h-full object-contain object-bottom"
              width={rocketSize}
              height={baseHeight}
            />
          </div>
          {/* Rocket: at crash row until meteoroid hits, then hidden; else at base or active row */}
          <div
            className={cn(
              'absolute right-0 z-10 flex flex-col items-center justify-end pointer-events-none',
              currentStep === 0 || exploded ? 'transition-none' : 'transition-[top] duration-300 ease-out',
              exploded && currentStep > 0 && showFlameAfterHit && 'opacity-0'
            )}
            style={{ top: rocketTop, width: rocketSize + 8, height: rocketSize }}
            aria-hidden
          >
            <img
              src={ROCKET_IMAGE}
              alt=""
              className="shrink-0 object-contain object-center relative z-[1]"
              style={{ width: rocketSize, height: rocketSize }}
              width={rocketSize}
              height={rocketSize}
            />
            {/* Fire particles from under the rocket, starting from 1st step (when rocket is shown and not exploded) */}
            {!exploded && (
              <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 flex justify-center items-end gap-0.5 overflow-visible"
                style={{ height: Math.round(rocketSize * 0.4), width: rocketSize * 0.35 }}
                aria-hidden
              >
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="rocket-exhaust-particle rounded-full bg-gradient-to-t from-amber-600 via-orange-500 to-yellow-400 shrink-0"
                    style={{
                      width: Math.max(4, rocketSize * 0.05),
                      height: Math.max(8, rocketSize * 0.12),
                      animationDelay: `${i * 0.08}s`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
          {/* Hit meteoroid: same lane (spacer/rocket only), same size and speed as passing; disappears on impact */}
          {exploded && currentStep > 0 && !showFlameAfterHit && (
            <div
              className="absolute right-0 z-[15] overflow-hidden pointer-events-none"
              style={{
                left: METEOROID_LANE_LEFT_PX,
                top: crashFlameTop - Math.round(rowPaddingY * 0.6),
                height: rowPaddingY * 2 + 24,
              }}
              aria-hidden
            >
              <img
                src={METEOROID_IMAGE}
                alt=""
                className="rocket-meteoroid-hit-pass absolute object-contain"
                style={{
                  width: METEOROID_SIZE,
                  height: METEOROID_SIZE,
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}
                width={METEOROID_SIZE}
                height={METEOROID_SIZE}
              />
            </div>
          )}
          {/* Explosion animation at crash row when rocket is hit by meteoroid */}
          {exploded && currentStep > 0 && showFlameAfterHit && (
            <div
              className="absolute right-0 z-20 flex items-center justify-center pointer-events-none overflow-visible"
              style={{ top: crashFlameTop, width: rocketSize + 8, height: rocketSize }}
              aria-hidden
            >
              <Player
                autoplay
                loop={false}
                keepLastFrame
                src={EXPLOSION_JSON}
                style={{ width: rocketSize, height: rocketSize }}
              />
            </div>
          )}
          {rows.map((row, index) => {
            const mult = row.multiplier;
            const displayMultiplier = mult / RTP - DISPLAY_HOUSE_EDGE;
            const chancePct = row.reachProbability * 100;
            const profitOnWin = betAmount > 0 ? betAmount * (mult - 1) : 0;
            const isRocketPosition = index === currentStep && !exploded;
            const isExplosionPosition = index === currentStep && exploded;
            const isActive = index === currentStep;
            return (
              <div
                key={index}
                ref={(el) => {
                  if (index === 0) (firstRowRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
                  if (isActive) (activeNodeRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
                }}
                className={cn(
                  'relative flex items-center gap-4 md:gap-8 lg:gap-12',
                  isRocketPosition && 'z-[1]',
                  isExplosionPosition && 'z-[1]'
                )}
                style={{ paddingTop: rowPaddingY, paddingBottom: rowPaddingY }}
              >
                {/* Horizontal lane border: thicker dashes with visible gaps (below meteoroids) */}
                <div
                  className="pointer-events-none absolute bottom-0 left-0 right-0 z-0"
                  style={{
                    height: 2,
                    background:
                      'repeating-linear-gradient(to right, rgba(177,180,211,0.55) 0px, rgba(177,180,211,0.55) 10px, transparent 10px, transparent 32px)',
                  }}
                  aria-hidden
                />
                {/* Meteoroid lane: only after 1s into round (so new round = no meteoroids at start), and not during crash */}
                {hasStarted &&
                  meteoroidsEnabled &&
                  !exploded &&
                  index > currentStep &&
                  !(pendingAdvance && index === currentStep + 1) && (
                  <div
                    key={`meteoroid-${index}-${roundId}-${difficulty}-${exploded}`}
                    className="absolute top-0 right-0 bottom-0 overflow-hidden pointer-events-none z-[5]"
                    style={{ left: METEOROID_LANE_LEFT_PX }}
                    aria-hidden
                  >
                    <img
                      src={METEOROID_IMAGE}
                      alt=""
                      className="rocket-meteoroid-pass absolute object-contain"
                      style={{
                        width: METEOROID_SIZE,
                        height: METEOROID_SIZE,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        opacity: 1,
                        animationDelay: `${meteoroidDelays[index]}s`,
                      }}
                      width={METEOROID_SIZE}
                      height={METEOROID_SIZE}
                    />
                  </div>
                )}
                {/* Multiplier box: click/focus opens popover with Profit on Win + Chance */}
                <div className="relative z-[1] shrink-0">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          'rounded-lg px-4 py-2 min-w-[72px] text-center font-semibold text-neutral-default',
                          'bg-brand-stronger/80 border border-neutral-weak/40',
                          'hover:bg-brand-stronger focus:outline-none focus:ring-2 focus:ring-neutral-weak/60 focus:ring-offset-2 focus:ring-offset-transparent',
                          isRocketPosition && 'ring-2 ring-[#00e600]/50',
                          isExplosionPosition && 'ring-2 ring-red-500/50'
                        )}
                      >
                        {displayMultiplier.toFixed(2)}x
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      side="bottom"
                      align="start"
                      sideOffset={6}
                      className="w-auto rounded-lg border border-neutral-weak/40 bg-brand-stronger p-3 text-neutral-default shadow-lg"
                    >
                      <div className="flex items-stretch gap-4">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-xs font-medium text-neutral-weak">Profit on Win</span>
                          <div className="flex items-center rounded-md border border-neutral-weak/40 bg-brand-weak/80 px-2.5 py-1.5 text-sm font-semibold text-white">
                            <span className="text-neutral-weak">$</span>
                            <span className="ml-1">{profitOnWin.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <span className="text-xs font-medium text-neutral-weak">Chance</span>
                          <div className="flex items-center rounded-md border border-neutral-weak/40 bg-brand-weak/80 px-2.5 py-1.5 text-sm font-semibold text-white">
                            <span>{chancePct.toFixed(6)}</span>
                            <span className="ml-1">%</span>
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                {/* Spacer: distance between multiplier bar and rocket/base; responsive to screen size */}
                <div className="shrink-0 w-[112px] sm:w-[140px] md:w-[180px] lg:w-[220px]" aria-hidden />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
