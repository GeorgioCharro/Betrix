import { Link } from '@tanstack/react-router';

import CommonTooltip from '@/components/ui/common-tooltip';
import type { NavItem } from '@/const/navigation';
import { cn } from '@/lib/utils';

interface SideMenuItemProps {
  item: NavItem;
  isOpen: boolean;
  onClick: (e: React.MouseEvent<HTMLAnchorElement>, path: string) => void;
}

export default function SideMenuItem({
  item,
  isOpen,
  onClick,
}: SideMenuItemProps): JSX.Element {
  const iconClass = 'h-6 w-6';
  const itemClasses = cn(
    'flex items-center gap-2 rounded px-3 py-2 hover:bg-brand-weaker',
    isOpen ? 'justify-start' : 'justify-center'
  );

  return (
    <CommonTooltip content={item.label} forceHide={isOpen}>
      <Link
        className={itemClasses}
        onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
          onClick(e, item.path);
        }}
        to={item.path}
      >
        <item.icon className={iconClass} />
        {isOpen ? (
          <span className="text-sm whitespace-nowrap">{item.label}</span>
        ) : null}
      </Link>
    </CommonTooltip>
  );
}
