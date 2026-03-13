import type { Dispatch, SetStateAction } from 'react';

import { BetAmountInput } from '../common/components/BetAmountInput';

interface BetPanelProps {
  betAmount: number;
  setBetAmount: Dispatch<SetStateAction<number>>;
  cashoutAt: number;
  setCashoutAt: Dispatch<SetStateAction<number>>;
  roundState: 'WAITING' | 'RUNNING' | 'CRASHED';
  onPlaceBet: () => void;
  betActive: boolean;
  betQueued: boolean;
  profitOnWin: number;
  players: number;
  totalBet: number;
}

export function BetPanel({
  betAmount,
  setBetAmount,
  cashoutAt,
  setCashoutAt,
  roundState,
  onPlaceBet,
  betActive,
  betQueued,
  profitOnWin,
  players,
  totalBet,
}: BetPanelProps): JSX.Element {
  let buttonLabel = 'Bet';
  const minCashout = 1.01;
  const showCashoutError = cashoutAt < minCashout;
  const disabled = betActive || betQueued || showCashoutError;

  if (betQueued) {
    buttonLabel = 'Bet queued for next round';
  } else if (betActive) {
    buttonLabel = 'Bet active';
  } else if (roundState !== 'WAITING') {
    buttonLabel = 'Bet (Next Round)';
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        <button className="text-sm font-semibold text-white">Manual</button>
        <button className="text-sm text-slate-500" type="button">
          Auto
        </button>
      </div>

      <div className="space-y-3">
        <BetAmountInput
          betAmount={betAmount}
          isInputDisabled={false}
          onBetAmountChange={(amount, multiplier = 1) => {
            setBetAmount(amount * multiplier);
          }}
        />

        <div>
          <p className="text-xs text-slate-400">Cashout At</p>
          <input
            className="mt-1 w-full rounded bg-slate-800 px-2 py-1 text-sm text-slate-50 outline-none border border-slate-700"
            type="number"
            min={1}
            step={0.01}
            value={cashoutAt === 0 ? '' : cashoutAt}
            onChange={e => {
              const { value } = e.target;
              if (value === '') {
                setCashoutAt(0);
              } else {
                setCashoutAt(Number(value));
              }
            }}
          />
          {showCashoutError && (
            <p className="mt-1 text-[11px] text-red-400">
              this must be greater than or equal to {minCashout.toFixed(2)}
            </p>
          )}
        </div>

        <div className="mt-2 space-y-1">
          <button
            type="button"
            disabled={disabled}
            onClick={onPlaceBet}
            className="w-full rounded bg-blue-600 py-2 text-sm font-semibold text-white disabled:bg-slate-600 disabled:cursor-not-allowed"
          >
            {buttonLabel}
          </button>
        </div>

        <div className="mt-2">
          <p className="text-xs text-slate-400">Profit on Win</p>
          <div className="mt-1 h-9 rounded bg-slate-800 px-2 py-1 text-sm flex items-center">
            {profitOnWin.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-slate-800 pt-3 space-y-1 text-xs">
        <p className="flex justify-between">
          <span className="text-slate-400">Players</span>
          <span className="text-slate-100">{players}</span>
        </p>
        <p className="flex justify-between">
          <span className="text-slate-400">Total Bets</span>
          <span className="text-slate-100">{totalBet.toFixed(2)}</span>
        </p>
      </div>
    </div>
  );
}

