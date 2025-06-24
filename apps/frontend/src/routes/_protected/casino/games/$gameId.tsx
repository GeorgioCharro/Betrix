import { createFileRoute } from '@tanstack/react-router';

import Blackjack from '@/features/games/blackjack';
import { DiceGame } from '@/features/games/dice';
import { Keno } from '@/features/games/keno';
import { Mines } from '@/features/games/mines';
import { Plinkoo } from '@/features/games/plinkoo';
import { Roulette } from '@/features/games/roulette';

export const Route = createFileRoute('/_protected/casino/games/$gameId')({
  component: GamePage,
});

function GamePage(): JSX.Element {
  const { gameId } = Route.useParams();

  switch (gameId) {
    case 'dice':
      return <DiceGame />;
    case 'roulette':
      return <Roulette />;
    case 'mines':
      return <Mines />;
    case 'plinkoo':
      return <Plinkoo />;
    case 'keno':
      return <Keno />;
    case 'blackjack':
      return <Blackjack />;
    default:
      return <div>Game not found</div>;
  }
}
