import * as React from 'react';

import { cn } from '@/lib/utils';

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  viewportClassName?: string;
}

export const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, viewportClassName, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('relative min-w-0 w-full max-w-full overflow-hidden', className)}
      {...props}
    >
      <div
        className={cn(
          'min-w-0 w-full max-w-full overflow-x-auto overflow-y-hidden',
          viewportClassName
        )}
      >
        {children}
      </div>
    </div>
  )
);

ScrollArea.displayName = 'ScrollArea';

