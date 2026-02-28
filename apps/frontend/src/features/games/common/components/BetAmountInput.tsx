import { BadgeDollarSign } from 'lucide-react';

import InputWithIcon from '@/common/forms/components/input-with-icon';
import { Label } from '@/components/ui/label';
import { useBalance } from '@/hooks/useBalance';

import { BetAmountButton } from './BetAmountButton';
import type { BettingControlsProps } from './BettingControls';

export function BetAmountInput({
  betAmount,
  onBetAmountChange,
  isInputDisabled,
  labelRight,
}: Pick<BettingControlsProps, 'betAmount' | 'onBetAmountChange'> & {
  isInputDisabled?: boolean;
  labelRight?: React.ReactNode;
}): JSX.Element {
  const balance = useBalance() ?? 0;
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <Label className="pl-px text-xs font-semibold">Bet Amount</Label>
        {labelRight && <div className="flex gap-2">{labelRight}</div>}
      </div>
      <div className="flex h-10 rounded-r overflow-hidden shadow-md group">
        <div className="bg-input-disabled rounded-l flex items-center gap-1">
          <InputWithIcon
            disabled={isInputDisabled}
            icon={<BadgeDollarSign className="text-gray-500" />}
            min={0}
            onChange={e => {
              if (!isInputDisabled) {
                onBetAmountChange?.(Number(e.target.value));
              }
            }}
            placeholder="0"
            step={1}
            type="number"
            value={betAmount === 0 && !isInputDisabled ? '' : betAmount}
            wrapperClassName="h-10 rounded-r-none rounded-none rounded-l"
          />
        </div>
        <BetAmountButton
          disabled={
            isInputDisabled ||
            (betAmount ? betAmount === 0 || betAmount / 2 < 0.01 : true)
          }
          label="½"
          onClick={() => {
            if (!isInputDisabled) {
              onBetAmountChange?.(betAmount ?? 0, 0.5);
            }
          }}
        />
        <BetAmountButton
          disabled={
            isInputDisabled ||
            (betAmount ? betAmount === 0 || 2 * betAmount > balance : true)
          }
          label="2×"
          onClick={() => {
            if (!isInputDisabled) {
              onBetAmountChange?.(betAmount ?? 0, 2);
            }
          }}
        />
      </div>
    </div>
  );
}
