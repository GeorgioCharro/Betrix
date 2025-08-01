import { Link } from '@tanstack/react-router';

import { NAV_ITEMS } from '@/const/navigation';
import { useAuthStore } from '@/features/auth/store/authStore';

export function BottomNavigation(): JSX.Element {
  const { user, showLoginModal } = useAuthStore();
  const generalItems = NAV_ITEMS.filter(item => item.type === 'general');

  const orderedPaths = [
    '/',
    '/provably-fair/calculation',
    '/casino/home',
    '/casino/my-bets',
    '/casino/challenges',
  ];

  const items = orderedPaths
    .map(path => generalItems.find(i => i.path === path))
    .filter((i): i is NonNullable<typeof i> => Boolean(i));

  const handleClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    path: string
  ): void => {
    if (
      (path === '/casino/my-bets' || path === '/casino/challenges') &&
      !user
    ) {
      e.preventDefault();
      showLoginModal();
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-around bg-brand-default py-2 shadow md:hidden">
      {items.map(item => (
        <Link
          className="flex flex-col items-center text-xs"
          key={item.path}
          onClick={e => {
            handleClick(e, item.path);
          }}
          to={item.path}
        >
          <item.icon className="h-5 w-5" />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
