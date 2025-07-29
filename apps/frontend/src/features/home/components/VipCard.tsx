import type { User } from '@repo/common/types';
import { ChevronRightIcon, StarIcon, InfoIcon } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export interface VipCardProps {
  user: Partial<User> & { username?: string };
  progress?: number;
}

export function VipCard({ user, progress = 0 }: VipCardProps): JSX.Element {
  const displayName = user.username ?? user.name ?? user.email ?? '';

  return (
    <div className="relative w-[320px] h-[215px]">

      <div className="absolute inset-0 translate-x-1 translate-y-1 rounded-md bg-[#0f212e] border border-[#1f2e3a] z-0" />

      <Card className="relative z-10 bg-brand-stronger border border-border rounded-md px-4 py-4 flex flex-col justify-between h-full text-sm">

        <div className="flex items-center justify-between">
          <span className="font-semibold text-white">{displayName}</span>
          <StarIcon className="size-4 text-neutral-strong" />
        </div>

        <div className="h-6" />

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-white font-bold">
            <div className="flex items-center gap-1">
              <span>Your VIP Progress</span>
              <ChevronRightIcon className="size-3" />
            </div>
            <div className="flex items-center gap-1">
              <span>{progress.toFixed(2)}%</span>
              <InfoIcon className="size-3" />
            </div>
          </div>
          <Progress className="h-2" value={progress} />
        </div>

        <div className="flex justify-between items-center text-xs mt-3">
          <div className="flex flex-col items-center gap-1">
            <StarIcon className="size-4 text-neutral-strong" />
            <span className="text-neutral-weak">None</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <StarIcon className="size-4 text-yellow-400" fill="currentColor" />
            <span className="text-white font-medium">Bronze</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
