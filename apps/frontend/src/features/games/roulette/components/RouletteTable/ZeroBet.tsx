import { RouletteBetTypes } from '@repo/common/game-utils/roulette/validations.js';
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

function ZeroBet(): JSX.Element {
  const { hoverId } = useRouletteBoardHoverStore();

  const { isPreview } = useRouletteContext();

  const isNumberHover = !isPreview && getIsNumberHover({ number: 0, hoverId });
  const winningNumber = useWinningNumber();

  const betId = `${RouletteBetTypes.STRAIGHT}-0`;
  const { bets, addBet, isRouletteWheelStopped } = useRouletteStore();

  const isBet = bets[betId] && bets[betId].length > 0;
  const betAmount = sum(bets[betId]);

  const isWinning = isRouletteWheelStopped && Number(winningNumber) === 0;
  const betKey = useBetKey();
  return (
    <motion.div
      animate={
        isWinning
          ? {
              backgroundColor: ['#419e3f', '#69c267', '#419e3f'],
            }
          : {}
      }
      className={cn(
        'cursor-pointer select-none relative rounded-sm max-xs:size-5 flex items-center justify-center aspect-square size-8  lg:w-10 lg:h-10 text-base lg:text-sm font-semibold bg-roulette-green hover:bg-roulette-green-hover',
        {
          'bg-roulette-green-hover': isNumberHover,
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
      0
      {isBet ? (
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
          <Chip id={betId} size={6} value={betAmount} />
        </div>
      ) : null}
    </motion.div>
  );
}

export default ZeroBet;
