import * as React from 'react';

import { cn } from '@/lib/utils';

export interface BannerProps extends React.HTMLAttributes<HTMLDivElement> {
  iconSrc: string;
  title: string;
}

const Banner = React.forwardRef<HTMLDivElement, BannerProps>(
  ({ title, iconSrc, className, ...props }, ref) => (
    <div
      className={cn('bg-brand-stronger w-full py-8 overflow-hidden', className)}
      ref={ref}
      {...props}
    >
      <div className="container relative flex items-center justify-between py-4">
        <h1 className="text-2xl font-semibold text-neutral-default">{title}</h1>

        {/* Icon absolutely positioned so it doesn’t affect height */}
        <img
          alt=""
          className="absolute right-4 top-[90%] h-44 w-auto -translate-y-1/2 object-contain pointer-events-none"
          src={iconSrc}
        />
      </div>
    </div>
  )
);

Banner.displayName = 'Banner';
export { Banner };
