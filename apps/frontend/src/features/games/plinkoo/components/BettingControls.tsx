import type { Risk } from '@repo/common/game-utils/plinkoo/objects.js';
import { RISK_OPTIONS } from '@repo/common/game-utils/plinkoo/objects.js';
import type { ApiResponse } from '@repo/common/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { PlinkooBetResponse, PlinkooResult } from '@/api/games/plinkoo';
import { playPlinkoo } from '@/api/games/plinkoo';
import CommonSelect from '@/components/ui/common-select';
import { cn } from '@/lib/utils';

import { BetAmountInput } from '../../common/components/BetAmountInput';
import { BetButton } from '../../common/components/BettingControls';

interface BettingControlsProps {
  className?: string;
  betAmount: number;
  onBetAmountChange: (amount: number, multiplier?: number) => void;
  rows: number;
  onRowsChange: (rows: number) => void;
  risk: Risk;
  onRiskChange: (risk: Risk) => void;
  onResult: (result: PlinkooResult) => void;
}

const ROW_OPTIONS = [8, 12, 16];

function BettingControls({
  className = 'w-1/4',
  betAmount,
  onBetAmountChange,
  rows,
  onRowsChange,
  risk,
  onRiskChange,
  onResult,
}: BettingControlsProps): JSX.Element {
  const queryClient = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: playPlinkoo,
    onSuccess: (resp: ApiResponse<PlinkooBetResponse>) => {
      onResult(resp.data.state);
      queryClient.setQueryData(['balance'], () => resp.data.balance);
    },
  });

  const balance = queryClient.getQueryData<number>(['balance']);
  const isDisabled = betAmount <= 0 || betAmount > (balance ?? 0);

  return (
    <div className={cn('bg-brand-weak flex flex-col gap-4 p-3', className)}>
      <BetAmountInput
        betAmount={betAmount}
        onBetAmountChange={onBetAmountChange}
      />
      <CommonSelect
        label="Rows"
        onValueChange={value => {
          onRowsChange(Number(value));
        }}
        options={ROW_OPTIONS.map(r => ({
          label: r.toString(),
          value: r.toString(),
        }))}
        triggerClassName="h-10 text-sm font-medium bg-brand-stronger"
        value={rows.toString()}
      />
      <CommonSelect
        label="Risk"
        onValueChange={value => {
          onRiskChange(value as Risk);
        }}
        options={RISK_OPTIONS.map(r => ({ label: r, value: r }))}
        triggerClassName="h-10 text-sm font-medium bg-brand-stronger"
        value={risk}
      />
      <BetButton
        disabled={isDisabled}
        isPending={isPending}
        loadingImage="/games/dice/loading-dice.png"
        onClick={() => {
          mutate({ betAmount, rows, risk });
        }}
      />
    </div>
  );
}

export default BettingControls;
