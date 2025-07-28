import type { LucideIcon } from 'lucide-react';
import * as React from 'react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface PromoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  imageSrc: string;
  title: string;
  icon: LucideIcon;
}

const PromoCard = React.forwardRef<HTMLDivElement, PromoCardProps>(
  ({ imageSrc, title, icon: Icon, className, ...props }, ref) => (
    <Card className={cn('overflow-hidden', className)} ref={ref} {...props}>
      <img alt={title} className="w-full h-40 " src={imageSrc} />
      <div className="bg-brand-default flex items-center justify-center gap-2 py-2">
        <Icon className="h-4 w-4 text-neutral-default" />
        <span className="text-neutral-default font-semibold">{title}</span>
      </div>
    </Card>
  )
);

PromoCard.displayName = 'PromoCard';

export { PromoCard };
