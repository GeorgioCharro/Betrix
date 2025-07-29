import * as React from 'react';

import { cn } from '@/lib/utils';

export type FooterProps = React.HTMLAttributes<HTMLDivElement>

export const Footer = React.forwardRef<HTMLElement, FooterProps>(
  ({ className, ...props }, ref) => (
    <footer
      ref={ref}
      {...props}
      className={cn('bg-brand-stronger py-4 text-neutral-default', className)}
    >
      <div className="container text-center text-sm">
        &copy; {new Date().getFullYear()} SimCasino
      </div>
    </footer>
  )
);

Footer.displayName = 'Footer';

export default Footer;