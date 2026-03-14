import { useEffect, useMemo, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useMotionValueEvent } from 'motion/react';

import type { CaseItem } from '../data/cases';

type CaseOpeningAnimationProps = {
  winningItem: CaseItem | null;
  isOpen: boolean;
  caseItems: CaseItem[];
  onComplete?: () => void;
  /** When true, show loading state inside the bar (e.g. while opening request is in flight). */
  isLoading?: boolean;
  /** Spin duration in seconds (first and gold phase). Default 4.5. Use e.g. 4, 4.2, 4.4, 4.6 for staggered multi-case. */
  duration?: number;
  /** Compact row for multi-case vertical layout (~4 rows visible at once). */
  compact?: boolean;
  /** Direction of the spin strip: horizontal (default) or vertical. */
  orientation?: 'horizontal' | 'vertical';
  /** Fixed slot size for multi-case vertical layout (e.g. 120×300). */
  slotSize?: { width: number; height: number };
  /** When true, omit border/background so a single outer container can wrap multiple spinners. */
  embeddedInGroup?: boolean;
  /** Case image to show above "Click Open Case to spin" when placeholder is visible. */
  caseImage?: string;
};

const STRIP_LENGTH = 80;
const START_INDEX = 15;
const WINNER_INDEX = 55;
const ITEM_WIDTH = 128; // w-32
const ITEM_HEIGHT = 128; // same as width for vertical slot
const ITEM_GAP = 8; // gap-2 ~= 0.5rem ~= 8px
const STEP = ITEM_WIDTH + ITEM_GAP;
const STEP_V = ITEM_HEIGHT + ITEM_GAP;
/** Vertical viewport height (min-h) so we can start strip with top at top of view. */
const VERTICAL_VIEWPORT_HEIGHT = 112;
/** Vertical start: top of strip at top of viewport so we see a long scroll. */
const STRIP_HEIGHT_V = STRIP_LENGTH * STEP_V;
const getStartYVertical = (viewportHeight: number) =>
  (STRIP_HEIGHT_V - viewportHeight) / 2;
const GOLD_PLACEHOLDER_URL = '/cases/cs2/gold.png';

/** Focus effect: max scale at center */
const FOCUS_MAX_SCALE = 1.12;
/** Distance (px) from center over which scale falls off */
const FOCUS_FALLOFF_DISTANCE = 120;
/** Opacity dimming for items far from center (0–1) */
const FOCUS_OPACITY_RANGE = 0.3;
/** Smooth transition for scale/opacity */
const FOCUS_TRANSITION = 'transform 0.1s linear, opacity 0.1s linear';

type VisualCaseItem = CaseItem & { visualChance: number };

const buildVisualItems = (items: CaseItem[]): VisualCaseItem[] => {
  if (items.length === 0) return [];

  const powered = items.map(item => {
    const weight = Math.pow(item.chance || 0, 0.7);
    return { item, weight };
  });

  const totalWeight = powered.reduce((sum, x) => sum + x.weight, 0);

  if (totalWeight <= 0) {
    const equal = 1 / items.length;
    return items.map(item => ({ ...item, visualChance: equal }));
  }

  return powered.map(({ item, weight }) => ({
    ...item,
    visualChance: weight / totalWeight,
  }));
};

const pickVisualItem = (items: VisualCaseItem[]): VisualCaseItem => {
  const r = Math.random();

  let cumulative = 0;
  for (const item of items) {
    cumulative += item.visualChance;
    if (r <= cumulative) return item;
  }

  return items[items.length - 1];
};

type Phase = 'idle' | 'first' | 'gold';

const DEFAULT_DURATION = 4.5;

export function CaseOpeningAnimation({
  winningItem,
  isOpen,
  caseItems,
  onComplete,
  isLoading = false,
  duration = DEFAULT_DURATION,
  compact = false,
  orientation = 'horizontal',
  slotSize,
  embeddedInGroup = false,
  caseImage,
}: CaseOpeningAnimationProps): JSX.Element {
  const verticalViewportHeight = slotSize?.height ?? VERTICAL_VIEWPORT_HEIGHT;
  const startYVertical = getStartYVertical(verticalViewportHeight);
  const startX = -(START_INDEX * STEP);
  const startY = orientation === 'vertical' ? startYVertical : -(START_INDEX * STEP_V);
  const [targetX, setTargetX] = useState(startX);
  const [targetY, setTargetY] = useState(startY);
  const [phase, setPhase] = useState<Phase>('idle');
  const [showDetails, setShowDetails] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lineRef = useRef<HTMLDivElement | null>(null);
  const winnerRef = useRef<HTMLDivElement | null>(null);

  /** Current scroll position (for focus scale/opacity); only relevant when showStrip */
  const [scrollPosition, setScrollPosition] = useState({ x: startX, y: startY });
  /** Container size for center-line position */
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const motionX = useMotionValue(startX);
  const motionY = useMotionValue(startY);

  const hasCompletedRef = useRef(false);
  const onCompleteRef = useRef<(() => void) | undefined>(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  /** Track container size for center-line position */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setContainerSize({ width: Math.floor(width), height: Math.floor(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const visualItems = useMemo(
    () => buildVisualItems(caseItems),
    [caseItems]
  );

  const goldItems = useMemo(
    () => caseItems.filter(item => item.isGold),
    [caseItems]
  );

  const visualItemsGold = useMemo(
    () => buildVisualItems(goldItems.length > 0 ? goldItems : caseItems),
    [goldItems, caseItems]
  );

  const firstStrip = useMemo(() => {
    if (!winningItem || visualItems.length === 0) return [];

    const arr: CaseItem[] = [];

    for (let i = 0; i < STRIP_LENGTH; i += 1) {
      arr.push(pickVisualItem(visualItems));
    }

    if (WINNER_INDEX - 1 >= 0) {
      arr[WINNER_INDEX - 1] = pickVisualItem(visualItems);
    }
    if (WINNER_INDEX + 1 < STRIP_LENGTH) {
      arr[WINNER_INDEX + 1] = pickVisualItem(visualItems);
    }

    if (WINNER_INDEX >= 0 && WINNER_INDEX < STRIP_LENGTH) {
      const fromCase = caseItems.find(c => c.name === winningItem.name);
      arr[WINNER_INDEX] = {
        ...winningItem,
        image: fromCase?.image ?? winningItem.image,
      };
    }

    return arr;
  }, [visualItems, winningItem, caseItems]);

  const goldStrip = useMemo(() => {
    if (!winningItem || visualItemsGold.length === 0) return [];

    const arr: CaseItem[] = [];

    for (let i = 0; i < STRIP_LENGTH; i += 1) {
      arr.push(pickVisualItem(visualItemsGold));
    }

    if (WINNER_INDEX - 1 >= 0) {
      arr[WINNER_INDEX - 1] = pickVisualItem(visualItemsGold);
    }
    if (WINNER_INDEX + 1 < STRIP_LENGTH) {
      arr[WINNER_INDEX + 1] = pickVisualItem(visualItemsGold);
    }

    if (WINNER_INDEX >= 0 && WINNER_INDEX < STRIP_LENGTH) {
      const fromCase = caseItems.find(c => c.name === winningItem.name);
      arr[WINNER_INDEX] = {
        ...winningItem,
        image: fromCase?.image ?? winningItem.image,
      };
    }

    return arr;
  }, [visualItemsGold, winningItem, caseItems]);

  const itemsStrip = phase === 'gold' ? goldStrip : firstStrip;

  // When we get a new spin (isOpen + winningItem), start first phase and reset
  useEffect(() => {
    if (!isOpen || !winningItem) {
      setPhase('idle');
      hasCompletedRef.current = false;
       setShowDetails(false);
      setTargetX(startX);
      setTargetY(startY);
    } else {
      setPhase('first');
      setTargetX(startX);
      setTargetY(startY);
      hasCompletedRef.current = false;
      setShowDetails(false);
    }
  }, [isOpen, startX, startY, winningItem]);

  // Measure and animate; on timeout either complete or start gold spin
  useEffect(() => {
    if (!isOpen || !winningItem || itemsStrip.length === 0) return;
    if (phase !== 'first' && phase !== 'gold') return;
    if (!containerRef.current || !lineRef.current || !winnerRef.current) return;
    if (WINNER_INDEX < 0 || WINNER_INDEX >= itemsStrip.length) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const lineRect = lineRef.current.getBoundingClientRect();
    const winnerRect = winnerRef.current.getBoundingClientRect();

    const durationMs = Math.round(duration * 1000);

    if (orientation === 'vertical') {
      const lineCenterY =
        lineRect.top - containerRect.top + lineRect.height / 2;
      const winnerCenterY =
        winnerRect.top - containerRect.top + winnerRect.height / 2;
      const delta = lineCenterY - winnerCenterY;
      const yEnd = startY + delta;
      setTargetY(yEnd);
    } else {
      const lineCenterX =
        lineRect.left - containerRect.left + lineRect.width / 2;
      const winnerCenterX =
        winnerRect.left - containerRect.left + winnerRect.width / 2;
      const delta = lineCenterX - winnerCenterX;
      const xEnd = startX + delta;
      setTargetX(xEnd);
    }

    const timeout = window.setTimeout(() => {
      if (phase === 'first' && winningItem?.isGold) {
        setPhase('gold');
        setTargetX(startX);
        setTargetY(startY);
        hasCompletedRef.current = false;
      } else if (!hasCompletedRef.current && onCompleteRef.current) {
        hasCompletedRef.current = true;
        setShowDetails(true);
        onCompleteRef.current();
      } else if (!hasCompletedRef.current) {
        // Even if there's no onComplete handler we still reveal the details.
        hasCompletedRef.current = true;
        setShowDetails(true);
      }
    }, durationMs);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isOpen, phase, itemsStrip.length, startX, startY, winningItem, duration, orientation]);

  const showStrip = Boolean(
    isOpen && winningItem && itemsStrip.length > 0 && (phase === 'first' || phase === 'gold')
  );
  const showPlaceholder = !showStrip;

  /** Drive scroll position with motion values so we can read current value for focus effect */
  useMotionValueEvent(motionX, 'change', (latest) => {
    setScrollPosition(prev => ({ ...prev, x: latest }));
  });
  useMotionValueEvent(motionY, 'change', (latest) => {
    setScrollPosition(prev => ({ ...prev, y: latest }));
  });

  useEffect(() => {
    if (!showStrip) return;
    motionX.set(startX);
    motionY.set(startY);
  }, [phase, startX, startY, showStrip]);

  useEffect(() => {
    // For gold phase we fall back to the original motion.animate props,
    // so we skip the manual motionValue animation here.
    if (!showStrip || phase === 'gold' || (phase !== 'first' && phase !== 'gold')) return;
    const controlsX = animate(motionX, targetX, {
      duration,
      ease: [0.15, 0.85, 0.25, 1],
    });
    const controlsY = animate(motionY, targetY, {
      duration,
      ease: [0.2, 0.8, 0.2, 1],
    });
    return () => {
      controlsX.stop();
      controlsY.stop();
    };
  }, [showStrip, phase, targetX, targetY, duration, motionX, motionY]);

  /** Compute scale and opacity for focus effect from item index and current scroll (horizontal only) */
  const getFocusStyle = (
    index: number,
    isVertical: boolean
  ): { transform: string; opacity: number; transition: string } => {
    const viewportWidth = containerSize.width || (slotSize?.width ?? 400);
    const indicatorX = viewportWidth / 2;
    const maxDistance = viewportWidth / 2;

    // Horizontal: derive distance from current scroll position and item index.
    const distance = Math.abs(
      index * STEP + ITEM_WIDTH / 2 + scrollPosition.x - indicatorX
    );

    const t = Math.min(distance / FOCUS_FALLOFF_DISTANCE, 1);
    const scale = 1 + (1 - t) * (FOCUS_MAX_SCALE - 1);
    const opacity = 1 - Math.min(distance / maxDistance, 1) * FOCUS_OPACITY_RANGE;

    return {
      transform: `scale(${scale})`,
      opacity,
      transition: FOCUS_TRANSITION,
    };
  };

  const isFirstSpin = phase === 'first';
  const isGoldSpin = phase === 'gold';

  /**
   * Vertical focus scaling effect: measure each item's distance from the spinner's
   * vertical center using DOM coordinates and update scale/opacity via rAF.
   */
  useEffect(() => {
    if (!showStrip || orientation !== 'vertical') return;

    let frameId: number;

    const update = () => {
      const container = containerRef.current;
      if (!container) return;

      const spinnerRect = container.getBoundingClientRect();
      const spinnerCenterY = spinnerRect.top + spinnerRect.height / 2;
      const maxDistance = spinnerRect.height / 2 || 1;

      const items = container.querySelectorAll<HTMLDivElement>('[data-case-item]');

      items.forEach(el => {
        const rect = el.getBoundingClientRect();
        const itemCenterY = rect.top + rect.height / 2;
        const distance = Math.abs(itemCenterY - spinnerCenterY);

        const t = Math.min(distance / FOCUS_FALLOFF_DISTANCE, 1);
        const scale = 1 + (1 - t) * (FOCUS_MAX_SCALE - 1);
        const opacity =
          1 - Math.min(distance / maxDistance, 1) * FOCUS_OPACITY_RANGE;

        el.style.transform = `scale(${scale})`;
        el.style.opacity = String(opacity);
        el.style.transition = FOCUS_TRANSITION;
      });

      frameId = window.requestAnimationFrame(update);
    };

    frameId = window.requestAnimationFrame(update);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [showStrip, orientation, verticalViewportHeight]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${
        embeddedInGroup
          ? ''
          : 'rounded-md border border-border bg-slate-900/80'
      } ${
        slotSize
          ? ''
          : compact
            ? 'mt-0 px-4 py-2'
            : 'mt-6 px-6 py-3'
      } ${
        orientation === 'vertical'
          ? 'flex items-center justify-center'
          : 'w-full flex items-center justify-center'
      }`}
      style={
        slotSize
          ? {
              width: slotSize.width,
              height: slotSize.height,
              minHeight: slotSize.height,
            }
          : orientation === 'vertical'
            ? { minHeight: verticalViewportHeight }
            : {
                height: ITEM_HEIGHT + 40,
                minHeight: ITEM_HEIGHT + 40,
                maxWidth: '100%',
              }
      }
    >
      {/* Invisible center line: still used for alignment math, but not visible */}
      <div
        ref={lineRef}
        className={
          orientation === 'vertical'
            ? 'pointer-events-none absolute top-1/2 left-0 right-0 h-[2px] -translate-y-1/2 bg-transparent z-20'
            : 'pointer-events-none absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-transparent z-20'
        }
      />
      {showPlaceholder && (
        <div
          className={`flex flex-col items-center justify-center gap-3 text-sm text-neutral-400 ${
            slotSize ? 'h-full w-full' : compact ? 'h-12 min-h-12' : 'min-h-16'
          } ${orientation === 'vertical' && !slotSize ? 'w-full' : ''}`}
        >
          {isLoading ? (
            <span>Opening case…</span>
          ) : (
            <>
              {caseImage && (
                <img
                  src={caseImage}
                  alt=""
                  className="max-h-24 w-auto max-w-[140px] object-contain"
                />
              )}
              <span>Click Open Case to spin</span>
            </>
          )}
        </div>
      )}
      {showStrip && orientation === 'horizontal' && (
        isGoldSpin ? (
          // Gold phase: use original motion animate props to ensure smooth second spin
          <motion.div
            key={phase}
            className="absolute inset-0 flex items-center justify-start gap-2"
            initial={{ x: startX }}
            animate={{ x: targetX }}
            transition={{ duration, ease: [0.15, 0.85, 0.25, 1] }}
          >
            {itemsStrip.map((item, idx) => {
              const ref = idx === WINNER_INDEX ? winnerRef : undefined;
              const showAsGoldPlaceholder =
                isFirstSpin && item.isGold;
              const displaySrc = showAsGoldPlaceholder
                ? GOLD_PLACEHOLDER_URL
                : item.image;

              return (
                <div
                  // eslint-disable-next-line react/no-array-index-key
                  key={`${item.name}-${idx}-${phase}`}
                  ref={ref}
                  className={`flex w-32 flex-shrink-0 flex-col items-center justify-center px-2 text-center text-xs text-neutral-100 ${
                    compact ? 'py-2' : 'py-3'
                  }`}
                >
                  {displaySrc ? (
                    <img
                      src={displaySrc}
                      alt={item.name}
                      className="h-20 w-24 object-contain"
                    />
                  ) : (
                    <span className="truncate font-semibold">{item.name}</span>
                  )}
                  {showDetails && idx === WINNER_INDEX && winningItem && (
                    <div className="mt-1 text-[11px] text-center text-neutral-100 opacity-0 animate-case-winning-fade-in">
                      <div className="font-semibold truncate max-w-[7rem]">
                        {winningItem.name}
                      </div>
                      <div className="text-neutral-400">
                        {winningItem.value.toFixed(2)} coins
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key={phase}
            className="absolute inset-0 flex items-center justify-start gap-2"
            style={{ x: motionX }}
          >
            {itemsStrip.map((item, idx) => {
              const ref = idx === WINNER_INDEX ? winnerRef : undefined;
              const showAsGoldPlaceholder =
                isFirstSpin && item.isGold;
              const displaySrc = showAsGoldPlaceholder
                ? GOLD_PLACEHOLDER_URL
                : item.image;
              const focusStyle = getFocusStyle(idx, false);

              return (
                <div
                  // eslint-disable-next-line react/no-array-index-key
                  key={`${item.name}-${idx}-${phase}`}
                  ref={ref}
                  style={focusStyle}
                  className={`flex w-32 flex-shrink-0 flex-col items-center justify-center px-2 text-center text-xs text-neutral-100 ${
                    compact ? 'py-2' : 'py-3'
                  }`}
                >
                  {displaySrc ? (
                    <img
                      src={displaySrc}
                      alt={item.name}
                      className="h-20 w-24 object-contain"
                    />
                  ) : (
                    <span className="truncate font-semibold">{item.name}</span>
                  )}
                  {showDetails && idx === WINNER_INDEX && winningItem && (
                    <div className="mt-1 text-[11px] text-center text-neutral-100 opacity-0 animate-case-winning-fade-in">
                      <div className="font-semibold truncate max-w-[7rem]">
                        {winningItem.name}
                      </div>
                      <div className="text-neutral-400">
                        {winningItem.value.toFixed(2)} coins
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </motion.div>
        )
      )}
      {showStrip && orientation === 'vertical' && (
        isGoldSpin ? (
          // Gold phase vertical: original motion animate props
          <motion.div
            key={phase}
            className="flex flex-col gap-2"
            style={{ width: slotSize?.width ?? 120 }}
            initial={{ y: startY }}
            animate={{ y: targetY }}
            transition={{
              duration,
              ease: [0.2, 0.8, 0.2, 1],
            }}
          >
            {itemsStrip.map((item, idx) => {
              const ref = idx === WINNER_INDEX ? winnerRef : undefined;
              const showAsGoldPlaceholder =
                isFirstSpin && item.isGold;
              const displaySrc = showAsGoldPlaceholder
                ? GOLD_PLACEHOLDER_URL
                : item.image;

              return (
                <div
                  // eslint-disable-next-line react/no-array-index-key
                  key={`${item.name}-${idx}-${phase}`}
                  ref={ref}
                  data-case-item
                  className={`flex h-32 w-full flex-shrink-0 flex-col items-center justify-center px-2 text-center text-xs text-neutral-100 ${
                    compact ? 'py-2' : 'py-3'
                  }`}
                >
                  {displaySrc ? (
                    <img
                      src={displaySrc}
                      alt={item.name}
                      className="h-20 w-24 object-contain"
                    />
                  ) : (
                    <span className="truncate font-semibold">{item.name}</span>
                  )}
                  {showDetails && idx === WINNER_INDEX && winningItem && (
                    <div className="mt-1 text-[11px] text-center text-neutral-100 opacity-0 animate-case-winning-fade-in">
                      <div className="font-semibold truncate max-w-[7rem]">
                        {winningItem.name}
                      </div>
                      <div className="text-neutral-400">
                        {winningItem.value.toFixed(2)} coins
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key={phase}
            className="flex flex-col gap-2"
            style={{ width: slotSize?.width ?? 120, y: motionY }}
            initial={false}
          >
            {itemsStrip.map((item, idx) => {
              const ref = idx === WINNER_INDEX ? winnerRef : undefined;
              const showAsGoldPlaceholder =
                isFirstSpin && item.isGold;
              const displaySrc = showAsGoldPlaceholder
                ? GOLD_PLACEHOLDER_URL
                : item.image;
              const focusStyle = getFocusStyle(idx, true);

              return (
                <div
                  // eslint-disable-next-line react/no-array-index-key
                  key={`${item.name}-${idx}-${phase}`}
                  ref={ref}
                  data-case-item
                  className={`flex h-32 w-full flex-shrink-0 flex-col items-center justify-center px-2 text-center text-xs text-neutral-100 ${
                    compact ? 'py-2' : 'py-3'
                  }`}
                >
                  {displaySrc ? (
                    <img
                      src={displaySrc}
                      alt={item.name}
                      className="h-20 w-24 object-contain"
                    />
                  ) : (
                    <span className="truncate font-semibold">{item.name}</span>
                  )}
                  {showDetails && idx === WINNER_INDEX && winningItem && (
                    <div className="mt-1 text-[11px] text-center text-neutral-100 opacity-0 animate-case-winning-fade-in">
                      <div className="font-semibold truncate max-w-[7rem]">
                        {winningItem.name}
                      </div>
                      <div className="text-neutral-400">
                        {winningItem.value.toFixed(2)} coins
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </motion.div>
        )
      )}
    </div>
  );
}
