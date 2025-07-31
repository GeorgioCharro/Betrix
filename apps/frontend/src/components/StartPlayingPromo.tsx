import { Club, Play } from 'lucide-react';
import * as React from 'react';

import { PromoCard } from '@/components/ui/promo-card';

export function StartPlayingPromo(): JSX.Element {
  return (
    <div className="container space-y-4 py-6 sm:hidden">
      <div className="flex items-center gap-2">
        <Play className="size-4 icon-neutral-weak" />
        <h2 className="font-semibold">Start Playing</h2>
      </div>
      <div className="flex justify-center">
        <PromoCard
          className="w-80"
          icon={Club}
          imageSrc="/banner/casino.png"
          navigateTo="/casino"
          title="Casino"
        />
      </div>
    </div>
  );
}
