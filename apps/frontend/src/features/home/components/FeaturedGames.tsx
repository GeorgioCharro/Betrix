import { Link } from '@tanstack/react-router';

const featuredGames = [
  {
    id: 'mines',
    image: '/games/mines/mines-icon.png',
  },
  {
    id: 'dice',
    image: '/games/dice/dice-icon.png',
  },
  {
    id: 'plinkoo',
    image: '/games/plinkoo/plinkoo-icon.png',
  },
  {
    id: 'roulette',
    image: '/games/roulette/roulette-icon.png',
  },
  {
    id: 'keno',
    image: '/games/keno/keno-icon.png',
  },
  {
    id: 'blackjack',
    image: '/games/blackjack/blackjack-icon.png',
  },
];

export function FeaturedGames(): JSX.Element {
  return (
    <section className="py-8">
      <h2 className="mb-6 text-2xl font-bold">Featured Games</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 md:grid-cols-4 lg:grid-cols-6">
        {featuredGames.map(game => (
          <Link
            className="w-28 overflow-hidden rounded-xl shadow-md transition-all hover:shadow-lg"
            key={game.id}
            params={{ gameId: game.id }}
            to="/casino/games/$gameId"
          >
            <img
              alt={game.id}
              className="h-full w-full object-cover"
              src={game.image}
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
