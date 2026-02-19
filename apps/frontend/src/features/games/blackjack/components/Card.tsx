import { cn } from '@/lib/utils';

const SUIT_SYMBOLS: Record<string, string> = {
  H: '♥',
  D: '♦',
  C: '♣',
  S: '♠',
};

const SUIT_COLORS: Record<string, string> = {
  H: 'text-red-500',
  D: 'text-red-500',
  C: 'text-gray-900',
  S: 'text-gray-900',
};

interface CardProps {
  suit: string;
  rank: string;
  faceDown?: boolean;
  className?: string;
  /** Animate as if just dealt from the deck */
  animateDeal?: boolean;
  /** Delay in ms before deal animation starts (for staggered dealing) */
  dealDelayMs?: number;
}

export function Card({
  suit,
  rank,
  faceDown = false,
  className,
  animateDeal = false,
  dealDelayMs = 0,
}: CardProps): JSX.Element {
  const baseCardClass = 'flex h-20 w-14 flex-shrink-0 items-center justify-center rounded-lg border-2 border-brand-weaker shadow-md';
  const dealStyle =
    animateDeal && dealDelayMs > 0 ? { animationDelay: `${dealDelayMs}ms` } : undefined;

  if (faceDown) {
    return (
      <div
        className={cn(
          baseCardClass,
          'bg-brand-stronger',
          animateDeal && 'animate-blackjack-deal',
          className
        )}
        style={dealStyle}
      >
        <div className="h-8 w-8 rounded bg-brand-weaker/50" />
      </div>
    );
  }

  const symbol = SUIT_SYMBOLS[suit] ?? suit;
  const colorClass = SUIT_COLORS[suit] ?? 'text-gray-900';

  return (
    <div
      className={cn(
        baseCardClass,
        'flex-col bg-white',
        colorClass,
        animateDeal && 'animate-blackjack-deal',
        className
      )}
      style={dealStyle}
    >
      <span className="text-lg font-bold leading-none">{rank}</span>
      <span className="text-xl leading-none">{symbol}</span>
    </div>
  );
}
