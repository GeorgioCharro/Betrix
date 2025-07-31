import { Link } from '@tanstack/react-router';
import { JoystickIcon } from 'lucide-react';

import { featuredGames } from '../const';

export function FeaturedGames(): JSX.Element {
  return (
    <section className="py-8 container">
      <div className="flex items-center gap-2">
        <JoystickIcon className="size-4 icon-neutral-weak" />
        <h2 className="font-semibold">Featured Games</h2>
      </div>
      <div className="grid grid-cols-2  sm:grid-cols-3 mt-4 gap-6 md:grid-cols-4 lg:grid-cols-6 ">
        {featuredGames.map(game => (
          <Link
            className="w-28 overflow-hidden rounded-xl shadow-md transition-all  duration-200 hover:-translate-y-1 hover:shadow-lg"
            key={game.id}
            params={{ gameId: game.id }}
            to="/casino/games/$gameId"
          >
            <img
              alt={game.id}
              className="h-full w-full h object-cover"
              src={game.image}
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
