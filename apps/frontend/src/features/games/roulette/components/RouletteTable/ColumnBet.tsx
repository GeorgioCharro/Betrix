import { RouletteBetTypes } from '@repo/common/game-utils/roulette/validations.js';
import { sum } from 'lodash';
import { motion } from 'motion/react';
import { useMemo } from 'react';

import { cn } from '@/lib/utils';

import { useRouletteContext } from '../../context/RouletteContext';
import { useRouletteBoardHoverStore } from '../../store/rouletteBoardHoverStore';
import useRouletteStore from '../../store/rouletteStore';
import {
  useWinningNumber,
  useBetKey,
} from '../../store/rouletteStoreSelectors';
import Chip from '../Chip';

function ColumnBet({ column }: { column: number }): JSX.Element {
  const { setHoverId } = useRouletteBoardHoverStore();

  const betId = `${RouletteBetTypes.COLUMN}-${column}`;
  const { bets, addBet, isRouletteWheelStopped } = useRouletteStore();

  const { isPreview } = useRouletteContext();

  const isBet = bets[betId] && bets[betId].length > 0;
  const betAmount = sum(bets[betId]);

  const winningNumber = useWinningNumber();
  const betKey = useBetKey();
  const isWinning = useMemo(() => {
    if (!isRouletteWheelStopped) return false;
    return (
      winningNumber &&
      winningNumber !== '0' &&
      Number(winningNumber) % 3 === column % 3
    );
  }, [column, isRouletteWheelStopped, winningNumber]);

  return (
    <motion.div
      animate={
        isWinning
          ? {
              backgroundColor: ['#0f212e', '#4b6e84', '#0f212e'],
            }
          : {}
      }
      className={cn(
        'cursor-pointer relative rounded-sm flex max-xs:size-5 items-center justify-center aspect-square size-8 lg:size-10 text-base lg:text-sm font-semibold bg-brand-stronger hover:bg-roulette-black-hover shadow-[inset_0_0_0_.15em_#2f4553] hover:shadow-[inset_0_0_0_.15em_#4b6e84]'
      )}
      key={betKey}
      onClick={e => {
        e.stopPropagation();
        if (!isPreview) {
          addBet(betId);
        }
      }}
      onKeyDown={event => {
        return event;
      }}
      onMouseEnter={() => {
        setHoverId(betId);
      }}
      onMouseLeave={() => {
        setHoverId(null);
      }}
      role="button"
      tabIndex={0}
      transition={
        isWinning
          ? {
              duration: 1,
              repeat: Infinity,
            }
          : {
              duration: 0,
              repeat: 0,
            }
      }
    >
      2:1
      {isBet ? (
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
          <Chip id={betId} size={6} value={betAmount} />
        </div>
      ) : null}
    </motion.div>
  );
}

export default ColumnBet;
