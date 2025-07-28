import { Link } from '@tanstack/react-router';
import {
  ChevronDown,
  Search as SearchIcon,
  X as CloseIcon,
} from 'lucide-react';
import { useState } from 'react';

import { Input } from '@/components/ui/input';
import { featuredGames } from '@/features/home/const';

export function SearchGames(): JSX.Element {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const results = featuredGames.filter(game =>
    game.id.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="relative space-y-4">
      <div
        className={`fixed inset-0 bg-brand-default transition-opacity duration-300 z-10 ${
          isFocused
            ? 'opacity-90 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
      />

      <div className="relative z-20 flex w-full overflow-hidden rounded border transition-colors duration-200 hover:border-brand-weakest border-brand-weaker bg-brand-strongest focus-within:border-brand-weakest">
        <div className="flex items-center gap-1 px-3 py-2 border-r border-brand-weaker">
          <span className="text-sm font-medium">Casino</span>
          <ChevronDown className="h-4 w-4" />
        </div>

        <div className="flex flex-1 items-center gap-2 px-3 relative">
          <SearchIcon className="h-4 w-4 text-muted-foreground" />
          <Input
            className="w-full border-0 p-0 pr-6 shadow-none focus:outline-none focus-visible:ring-0 bg-transparent"
            onBlur={() =>
              setTimeout(() => {
                setIsFocused(false);
              }, 200)
            }
            onChange={e => {
              setQuery(e.target.value);
            }}
            onFocus={() => {
              setIsFocused(true);
            }}
            placeholder="Search your game"
            type="text"
            value={query}
          />
          {isFocused ? (
            <button
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
              onClick={() => {
                setQuery('');
                setIsFocused(false);
              }}
              type="button"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          ) : null}
        </div>
      </div>

      {query && results.length > 0 ? (
        <div className="relative z-20 rounded-md bg-brand-strongest p-4">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {results.map(game => (
              <Link
                className="w-28 overflow-hidden rounded-xl shadow-md transition-all hover:shadow-lg"
                key={game.id}
                params={{ gameId: game.id }}
                to={`/casino/games/${game.id}`}
              >
                <img
                  alt={game.id}
                  className="h-full w-full object-cover"
                  src={game.image}
                />
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
