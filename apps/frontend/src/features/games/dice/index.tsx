import { Games } from '@/const/games';
import useDiceStore from '@/features/games/dice/store/diceStore';

import { DiceGameControls } from './components/DiceGameControls';
import { DiceResultPillsCarousel } from './components/DiceResultPillsCarousel';
import DiceSlider from './components/DiceSlider';
import { diceGameControls } from './config/controls';
import { useDiceBetting } from './hooks/useBetting';
import { useDiceAudio } from './hooks/useDiceAudio';
import { useResultSlider } from './hooks/useResultSlider';
import { useSliderValue } from './hooks/useSliderValue';
import { BettingControls } from '../common/components/BettingControls';
import GameSettingsBar from '../common/components/game-settings';
import GameDescriptionAccordion from '../common/components/GameDescriptionAccordion';

export function DiceGame(): JSX.Element {
  const diceState = useDiceStore();
  const { betAmount, profitOnWin, results, setBetAmount, setResult } =
    diceState;
  const { playBetSound } = useDiceAudio(false);
  const { showResultSlider, setLastResultId } = useResultSlider();
  const { handleValueChange } = useSliderValue();
  const { mutate, isPending } = useDiceBetting({
    setResult,
    setLastResultId,
  });

  const handleBet = async (): Promise<void> => {
    await playBetSound();
    mutate({
      target: diceState.target,
      condition: diceState.condition,
      betAmount,
    });
  };

  return (
    <>
      <div className="flex flex-col-reverse lg:flex-row w-full items-stretch mx-auto rounded-t-md overflow-hidden shadow-md">
        <BettingControls
          betAmount={betAmount}
          className="w-full lg:w-1/4"
          isPending={isPending}
          onBet={handleBet}
          onBetAmountChange={(amount, multiplier = 1) => {
            setBetAmount(amount * multiplier);
          }}
          profitOnWin={profitOnWin}
        />
        <div className="flex-1 bg-brand-stronger p-3">
          <DiceResultPillsCarousel results={results} />
          <div className="py-40 w-3/4 mx-auto flex flex-col gap-2">
            <DiceSlider
              handleValueChange={handleValueChange}
              showResultSlider={showResultSlider}
            />
          </div>
          <DiceGameControls controls={diceGameControls} state={diceState} />
        </div>
      </div>
      <GameSettingsBar game={Games.DICE} />
      <GameDescriptionAccordion game={Games.DICE} />
    </>
  );
}
