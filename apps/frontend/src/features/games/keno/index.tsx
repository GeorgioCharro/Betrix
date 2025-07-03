import {
  KENO_PROBABILITY,
  NO_OF_TILES_KENO,
  PAYOUT_MULTIPLIERS,
} from '@repo/common/game-utils/keno/constants.js';
import { BadgeDollarSign, BadgeDollarSignIcon } from 'lucide-react';

import { Label } from '@/components/ui/label';
import { Games } from '@/const/games';

import BettingControls from './components/BettingControls';
import KenoTile from './components/KenoTile';
import {
  useDrawnNumbers,
  usePayout,
  usePayoutMultiplier,
  useSelectedTiles,
} from './store/kenoSelectors';
import useKenoStore from './store/kenoStore';
import GameSettingsBar from '../common/components/game-settings';

export function Keno(): JSX.Element {
  const selectedTiles = useSelectedTiles();
  const { kenoRisk, hoveredTile, setHoveredTile, betAmount } = useKenoStore();
  const hoveredTilePayoutMultiplier =
    hoveredTile !== null
      ? PAYOUT_MULTIPLIERS[kenoRisk][selectedTiles.size][hoveredTile].toFixed(2)
      : null;

  const payoutMultiplier = usePayoutMultiplier();
  const payout = usePayout();
  const drawnNumbers = useDrawnNumbers();

  return (
    <>
      <div className="flex flex-col-reverse lg:flex-row w-full items-stretch mx-auto rounded-t-md overflow-hidden shadow-md">
        <BettingControls className="w-full lg:w-1/4" />

        <div className="flex-1 bg-brand-stronger p-4 relative">
          <div className="flex justify-center w-full">
            <div className="inline-grid grid-cols-8 mx-auto justify-items-center gap-2 md:gap-3">
              {Array.from({ length: NO_OF_TILES_KENO }, (_, i) => i).map(
                number => (
                  <KenoTile index={number + 1} isLoading={false} key={number} />
                )
              )}
            </div>
          </div>
          {selectedTiles.size === 0 ? (
            <div className="bg-brand-weaker rounded-sm text-neutral-default font-medium text-sm w-full mt-12 h-12 flex items-center justify-center">
              Select 1-10 numbers to play
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Payout row: perfectly aligned */}
              <div className="w-full mt-8">
                <div
                  className="grid gap-2"
                  style={{
                    gridTemplateColumns: `repeat(${selectedTiles.size + 1}, 1fr)`,
                    width: '100%',
                  }}
                >
                  {Array.from(
                    { length: selectedTiles.size + 1 },
                    (_, i) => i
                  ).map(tile => (
                    <div
                      className="
                        flex items-center justify-center
                        bg-brand-weaker rounded-sm text-neutral-default
                        h-10 max-xs:h-8 font-semibold w-full
                        text-[10px] sm:text-xs max-xs:text-[8px]
                        min-w-0 overflow-hidden px-0.5
                      "
                      key={tile}
                    >
                      <span
                        className="w-full text-center leading-tight"
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                      >
                        {PAYOUT_MULTIPLIERS[kenoRisk][selectedTiles.size][
                          tile
                        ].toFixed(2)}
                        x
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Gem row: perfectly aligned */}
              <div className="w-full">
                <div
                  className="grid gap-2 bg-brand-weaker relative"
                  style={{
                    gridTemplateColumns: `repeat(${selectedTiles.size + 1}, 1fr)`,
                    width: '100%',
                  }}
                >
                  {hoveredTile !== null && (
                    <div className="absolute -top-24 left-0 right-0 bg-brand-strong px-4 py-2 pb-3 rounded flex gap-4 w-full z-10">
                      <div className="flex-1 flex flex-col gap-1">
                        <Label className="pl-px text-sm font-semibold">
                          Payout
                        </Label>
                        <div className="flex-1 flex px-2 bg-brand-weaker rounded-sm text-neutral-default font-medium h-8 py-2">
                          {hoveredTilePayoutMultiplier}x
                        </div>
                      </div>
                      <div className="flex-1 flex flex-col gap-1">
                        <Label className="pl-px text-sm font-semibold">
                          Profit on Win
                        </Label>
                        <div className="flex-1 flex px-2 bg-brand-weaker rounded-sm justify-between items-center text-neutral-default font-medium h-8 py-2">
                          {(
                            Number(hoveredTilePayoutMultiplier) * betAmount
                          ).toFixed(8)}
                          <BadgeDollarSign className="size-5 icon-neutral-weak" />
                        </div>
                      </div>
                      <div className="flex-1 flex flex-col gap-1">
                        <Label className="pl-px text-sm font-semibold">
                          Chance
                        </Label>
                        <div className="flex-1 flex px-2 bg-brand-weaker rounded-sm text-neutral-default font-medium h-8 py-2">
                          {KENO_PROBABILITY[selectedTiles.size][hoveredTile]}
                        </div>
                      </div>
                    </div>
                  )}
                  {Array.from(
                    { length: selectedTiles.size + 1 },
                    (_, i) => i
                  ).map(tile => (
                    <div
                      className="
                        flex items-center justify-center
                        rounded-sm text-neutral-default h-10 max-xs:h-8 font-medium gap-1 w-full cursor-help
                        text-[10px] sm:text-xs max-xs:text-[8px]
                        min-w-0 overflow-hidden px-0.5
                      "
                      key={tile}
                      onMouseEnter={() => {
                        setHoveredTile(tile);
                      }}
                      onMouseLeave={() => {
                        setHoveredTile(null);
                      }}
                    >
                      <span className="flex items-center justify-center gap-1 w-full leading-tight">
                        {tile}x
                        <img
                          alt="diamond"
                          className="w-4 h-4 max-xs:w-3 max-xs:h-3 grayscale flex-shrink-0"
                          src="/games/keno/gem.svg"
                        />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {payoutMultiplier > 0 && drawnNumbers.size === 10 ? (
            <div className="absolute flex flex-col gap-2 border-[6px] border-[#00e600] rounded-xl left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-default p-2.5 w-32 items-center">
              <p className="text-[#00e600] text-xl font-bold">
                {payoutMultiplier.toFixed(2)}x
              </p>
              <div className="border-2 border-neutral-weaker w-1/2" />
              <p className="text-[#00e600] text-lg font-bold flex items-center gap-1">
                {payout || 0}
                <BadgeDollarSignIcon className="size-4" />
              </p>
            </div>
          ) : null}
        </div>
      </div>
      <GameSettingsBar game={Games.KENO} />
    </>
  );
}
