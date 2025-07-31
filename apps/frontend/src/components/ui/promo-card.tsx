import { useNavigate } from '@tanstack/react-router';
import type { LucideIcon } from 'lucide-react';
import * as React from 'react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface PromoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  imageSrc: string;
  title: string;
  icon: LucideIcon;
  navigateTo?: string;
}

const PromoCard = React.forwardRef<HTMLDivElement, PromoCardProps>(
  ({ imageSrc, title, icon: Icon, className, navigateTo, ...props }, ref) => {
    const navigate = useNavigate();

    const handleClick = (): void => {
      if (navigateTo) {
        void navigate({ to: navigateTo });
      }
    };

    return (
      <Card
        className={cn(
          'cursor-pointer w-[320px] h-[220px] flex flex-col justify-between overflow-hidden transition-transform duration-200 hover:-translate-y-1',
          className
        )}
        onClick={handleClick}
        ref={ref}
        {...props}
      >
        <img
          alt={title}
          className="w-full h-[180px] object-cover"
          src={imageSrc}
        />
        <div className="bg-brand-default flex items-center justify-center gap-2 py-2">
          <Icon className="h-4 w-4 text-neutral-default" />
          <span className="text-neutral-default font-semibold">{title}</span>
        </div>
      </Card>
    );
  }
);

PromoCard.displayName = 'PromoCard';

export { PromoCard };
