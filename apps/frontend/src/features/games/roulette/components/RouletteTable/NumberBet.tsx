import { redNumbers } from '@repo/common/game-utils/roulette/constants.js';
import { RouletteBetTypes } from '@repo/common/game-utils/roulette/index.js';
import { sum } from 'lodash';
import { motion } from 'motion/react';

import { cn } from '@/lib/utils';

import { useRouletteContext } from '../../context/RouletteContext';
import { useRouletteBoardHoverStore } from '../../store/rouletteBoardHoverStore';
import useRouletteStore from '../../store/rouletteStore';
import {
  useWinningNumber,
  useBetKey,
} from '../../store/rouletteStoreSelectors';
import { getIsNumberHover } from '../../utils/hover';
import Chip from '../Chip';

function NumberBet({ number }: { number: number }): JSX.Element {
  const { hoverId } = useRouletteBoardHoverStore();
  const winningNumber = useWinningNumber();
  const betKey = useBetKey();
  const { isPreview } = useRouletteContext();

  const isRedNumber = redNumbers.includes(number.toString());
  const isNumberHover = !isPreview && getIsNumberHover({ number, hoverId });

  const betId = `${RouletteBetTypes.STRAIGHT}-${number}`;

  const { bets, addBet, isRouletteWheelStopped } = useRouletteStore();

  const isBet = bets[betId] && bets[betId].length > 0;
  const betAmount = sum(bets[betId]);

  return (
    <motion.div
      animate={
        isRouletteWheelStopped && Number(winningNumber) === number
          ? {
              backgroundColor: isRedNumber
                ? ['#fe2247', '#fe6e86', '#fe2247']
                : ['#2f4553', '#4b6e84', '#2f4553'],
            }
          : {}
      }
      className={cn(
        'cursor-pointer rounded-sm flex items-center justify-center aspect-square max-xs:size-5 size-8 lg:size-10 text-base lg:text-sm font-semibold relative',
        isRedNumber
          ? 'bg-roulette-red hover:bg-roulette-red-hover'
          : 'bg-roulette-black hover:bg-roulette-black-hover',
        {
          'bg-roulette-red-hover': isRedNumber && isNumberHover,
          'bg-roulette-black-hover': !isRedNumber && isNumberHover,
        }
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
      role="button"
      tabIndex={0}
      transition={
        isRouletteWheelStopped && Number(winningNumber) === number
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
      {number}
      {isBet ? (
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
          <Chip id={betId} size={6} value={betAmount} />
        </div>
      ) : null}
    </motion.div>
  );
}

export default NumberBet;
