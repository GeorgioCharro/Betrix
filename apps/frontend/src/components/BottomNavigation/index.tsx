import { Link } from '@tanstack/react-router';

import { NAV_ITEMS } from '@/const/navigation';

export function BottomNavigation(): JSX.Element {
  const items = NAV_ITEMS;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-around bg-brand-default py-2 shadow md:hidden">
      {items.map(item => (
        <Link
          className="flex flex-col items-center text-xs"
          key={item.path}
          to={item.path}
        >
          <item.icon className="h-5 w-5" />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
