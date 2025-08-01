import { BallManager } from '@repo/common/game-utils/plinkoo/classes/ball-manager.js';
import type { Risk } from '@repo/common/game-utils/plinkoo/objects.js';
import { outcomesByRows } from '@repo/common/game-utils/plinkoo/outcomes.js';
import { useEffect, useRef, useState } from 'react';

import type { PlinkooResult } from '@/api/games/plinkoo';
import { Games } from '@/const/games';

import BettingControls from './components/BettingControls';
import GameSettingsBar from '../common/components/game-settings';
import GameDescriptionAccordion from '../common/components/GameDescriptionAccordion';

export function Plinkoo(): JSX.Element {
  const [betAmount, setBetAmount] = useState(0);
  const [rows, setRows] = useState(16);
  const [risk, setRisk] = useState<Risk>('Low');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ballManager, setBallManager] = useState<BallManager | null>(null);
  useEffect(() => {
    if (!canvasRef.current) return;

    if (ballManager) {
      ballManager.stop();
    }

    const manager = new BallManager(canvasRef.current, rows, risk);
    setBallManager(manager);

    return () => {
      manager.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ballManager is excluded to prevent stale instance reuse
  }, [rows, risk]);

  const handleResult = (result: PlinkooResult): void => {
    if (!ballManager) return;

    const starts = outcomesByRows[rows][result.point];
    const startX = starts[Math.floor(Math.random() * starts.length)];

    ballManager.addBall(startX);
  };

  return (
    <>
      <div className="mx-auto flex w-full flex-col-reverse items-stretch overflow-hidden rounded-t-md shadow-md lg:flex-row">
        <BettingControls
          betAmount={betAmount}
          className="w-full lg:w-1/4"
          onBetAmountChange={(amt, m = 1) => {
            setBetAmount(amt * m);
          }}
          onResult={handleResult}
          onRiskChange={setRisk}
          onRowsChange={setRows}
          risk={risk}
          rows={rows}
        />
        <div className="flex flex-1 justify-center bg-brand-stronger p-3">
          <canvas
            className="h-[700px] w-full lg:w-[800px]"
            height={700}
            ref={canvasRef}
            width={800}
          />
        </div>
      </div>
      <GameSettingsBar game={Games.PLINKOO} />
      <GameDescriptionAccordion game={Games.PLINKOO} />
    </>
  );
}

export default Plinkoo;
