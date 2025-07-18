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
    image: '/games/plinkoo.png',
  },
  {
    id: 'roulette',
    image: '/games/roulette.png',
  },
];

export function FeaturedGames(): JSX.Element {
  return (
    <section className="py-8">
      <h2 className="mb-6 text-2xl font-bold">Featured Games</h2>
      <div className="grid grid-cols-2 gap-6 md:grid-cols-2 lg:grid-cols-4">
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
