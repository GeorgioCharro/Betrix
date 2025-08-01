import { NO_OF_TILES } from '@repo/common/game-utils/mines/constants.js';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BadgeDollarSignIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

import { playRound } from '@/api/games/mines';
import { Games } from '@/const/games';

import ActiveGameTile from './components/ActiveGameTile';
import BettingControls from './components/BettingControls';
import InactiveGameTile from './components/InactiveGameTile';
import {
  useIsGameActive,
  useIsGameLost,
  useIsGameWon,
  useLastRound,
  useMines,
  usePayoutMultiplier,
  useSelectedTiles,
  useTotalPayout,
} from './store/minesSelectors';
import useMinesStore from './store/minesStore';
import GameSettingsBar from '../common/components/game-settings';
import GameDescriptionAccordion from '../common/components/GameDescriptionAccordion';

export function Mines(): JSX.Element {
  const { setGameState, gameState } = useMinesStore();
  const [loadingTiles, setLoadingTiles] = useState<Set<number>>(new Set());
  const [isPlayingRound, setIsPlayingRound] = useState(false);
  const [pendingTiles, setPendingTiles] = useState<number[]>([]);
  const queryClient = useQueryClient();
  const { mutate: playRoundMutate } = useMutation({
    mutationKey: ['mines-play-round'],
    mutationFn: (selectedTileIndex: number) => playRound(selectedTileIndex),
    onMutate: () => {
      setIsPlayingRound(true);
    },
    onSuccess: ({ data }) => {
      setGameState(data);
      if ('balance' in data) {
        queryClient.setQueryData(['balance'], () => data.balance);
      }
      setLoadingTiles(prev => {
        const newSet = new Set(prev);
        data.state.rounds.forEach(round => {
          newSet.delete(round.selectedTileIndex);
        });
        return newSet;
      });
      if (!data.active) {
        setPendingTiles([]);
        setLoadingTiles(new Set());
      }
    },
    onError: () => {
      setPendingTiles([]);
      setLoadingTiles(new Set());
    },
    onSettled: () => {
      setIsPlayingRound(false);
    },
  });

  useEffect(() => {
    if (!isPlayingRound && gameState?.active && pendingTiles.length > 0) {
      const [next, ...rest] = pendingTiles;
      setPendingTiles(rest);
      playRoundMutate(next);
    }
  }, [isPlayingRound, pendingTiles, playRoundMutate, gameState]);

  useEffect(() => {
    if (!gameState?.active) {
      setPendingTiles([]);
      setLoadingTiles(new Set());
    }
  }, [gameState]);

  const isGameActive = useIsGameActive();

  const isGameWon = useIsGameWon();
  const isGameLost = useIsGameLost();
  const mines = useMines();
  const selectedTiles = useSelectedTiles();
  const lastRound = useLastRound();
  const payoutMultiplier = usePayoutMultiplier();
  const payout = useTotalPayout();
  return (
    <>
      <div className="flex flex-col-reverse lg:flex-row w-full items-stretch mx-auto rounded-t-md overflow-hidden shadow-md">
        <BettingControls className="w-full lg:w-1/4" />
        <div className="flex-1 bg-brand-stronger p-3 lg:px-24 px-4 flex justify-center relative">
          <div className="inline-grid grid-cols-5 mx-auto justify-items-center gap-2.5">
            {Array.from({ length: NO_OF_TILES }, (_, i) => i).map(number =>
              isGameActive || !gameState ? (
                <ActiveGameTile
                  index={number}
                  isLoading={loadingTiles.has(number)}
                  key={number}
                  onClick={() => {
                    if (!isGameActive) return;
                    if (
                      loadingTiles.has(number) ||
                      pendingTiles.includes(number) ||
                      selectedTiles?.has(number)
                    ) {
                      return;
                    }
                    setLoadingTiles(prev => {
                      const newSet = new Set(prev);
                      newSet.add(number);
                      return newSet;
                    });
                    setPendingTiles(prev => [...prev, number]);
                  }}
                />
              ) : (
                <InactiveGameTile
                  index={number}
                  key={number}
                  {...{
                    isGameWon,
                    isGameLost,
                    mines,
                    selectedTiles,
                    lastRound,
                  }}
                />
              )
            )}
          </div>
          {isGameWon ? (
            <div className="absolute flex flex-col gap-2 border-[6px] border-[#00e600] rounded-xl left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-default p-2.5 w-32 items-center">
              <p className="text-[#00e600] text-xl font-bold">
                {payoutMultiplier || '1.00'}x
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
      <GameSettingsBar game={Games.MINES} />
      <GameDescriptionAccordion game={Games.MINES} />
    </>
  );
}
