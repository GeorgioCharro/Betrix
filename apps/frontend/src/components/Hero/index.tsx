import * as React from 'react';

import { cn } from '@/lib/utils';

export interface HeroProps extends React.HTMLAttributes<HTMLElement> {
  backgroundSrc: string;
}

export const Hero = React.forwardRef<HTMLElement, HeroProps>(
  ({ backgroundSrc, className, children, ...props }, ref) => (
    <section
      ref={ref}
      {...props}
      className={cn('bg-cover bg-center py-12', className)}
      style={{ backgroundImage: `url(${backgroundSrc})` }}
    >
      <div className="container">{children}</div>
    </section>
  )
);

Hero.displayName = 'Hero';
