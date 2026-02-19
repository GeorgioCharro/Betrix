import { cn } from '@/lib/utils';

interface CardDeckProps {
  className?: string;
  /** Number of cards to suggest remaining (visual only, slight stack offset) */
  size?: number;
}

export function CardDeck({ className, size = 6 }: CardDeckProps): JSX.Element {
  const cardsToShow = Math.min(size, 5);

  return (
    <div
      aria-hidden
      className={cn('relative', className)}
    >
      {Array.from({ length: cardsToShow }, (_, i) => (
        <div
          className="absolute flex h-20 w-14 flex-shrink-0 items-center justify-center rounded-lg border-2 border-brand-weaker bg-brand-stronger shadow-md"
          key={i}
          style={{
            top: i * 2,
            left: i * 2,
            zIndex: i,
          }}
        >
          <div className="h-8 w-8 rounded bg-brand-weaker/50" />
        </div>
      ))}
      {/* Slight glow/shadow behind stack */}
      <div
        className="absolute rounded-lg bg-brand-strongest/60 blur-sm"
        style={{
          top: (cardsToShow - 1) * 2 + 4,
          left: (cardsToShow - 1) * 2 + 4,
          width: 56,
          height: 80,
          zIndex: -1,
        }}
      />
    </div>
  );
}
