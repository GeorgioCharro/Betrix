interface MultiplierDisplayProps {
  multiplier: number;
  state: 'WAITING' | 'RUNNING' | 'CRASHED';
  canCashout: boolean;
  onCashout: () => void;
  lastCashout: { payout: number; multiplier: number } | null;
  waitingSecondsLeft?: number | null;
  currentReturn?: string;
}

export function MultiplierDisplay({
  multiplier,
  state,
  canCashout,
  onCashout,
  lastCashout,
  waitingSecondsLeft,
  currentReturn,
}: MultiplierDisplayProps): JSX.Element {
  const isCrashed = state === 'CRASHED';
  const color = isCrashed ? 'text-red-400' : 'text-white';

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-5xl sm:text-6xl font-extrabold">
        <span className={color}>{multiplier.toFixed(2)}x</span>
      </div>
      <div className="flex gap-3 items-center">
        <span className="text-xs text-slate-400 uppercase tracking-wide">
          {state === 'WAITING' &&
            `Next round in ${typeof waitingSecondsLeft === 'number' ? waitingSecondsLeft : 0}s`}
          {state === 'RUNNING' && 'Live'}
          {state === 'CRASHED' && 'Crashed'}
        </span>
        {canCashout && typeof currentReturn === 'string' && state === 'RUNNING' && (
          <div className="rounded-full bg-emerald-500/10 border border-emerald-500 px-3 py-1 text-xs font-semibold text-emerald-200">
            Return ${currentReturn}
          </div>
        )}
        {canCashout && (
          <button
            type="button"
            onClick={onCashout}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-blue-500"
          >
            Cash Out
          </button>
        )}
      </div>
      {lastCashout && (
        <div className="rounded border border-emerald-500 bg-emerald-900/40 px-3 py-2 text-xs text-emerald-100">
          Cashed out at {lastCashout.multiplier.toFixed(2)}x, payout{' '}
          {lastCashout.payout.toFixed(2)}
        </div>
      )}
    </div>
  );
}

