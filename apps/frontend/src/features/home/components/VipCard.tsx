import type { User } from '@repo/common/types';
import { ChevronRightIcon, StarIcon, InfoIcon } from 'lucide-react';

import { Card } from '@/components/ui/card';
import CommonTooltip from '@/components/ui/common-tooltip';
import { Progress } from '@/components/ui/progress';

const MAX_LEVEL = 100;

function getXpRequired(level: number): number {
  const clamped = Math.min(Math.max(1, Math.floor(level)), MAX_LEVEL);
  return Math.round(100 * Math.pow(clamped, 1.5));
}

function getLevelFromXp(xp: number): number {
  let level = 1;
  while (level < MAX_LEVEL && xp >= getXpRequired(level + 1)) {
    level += 1;
  }
  return level;
}

export interface VipCardProps {
  user: Partial<User> & { username?: string };
}

export function VipCard({ user }: VipCardProps): JSX.Element {
  const displayName = user.username ?? user.name ?? user.email ?? '';
  const xp = user.xp ?? 0;
  const level = typeof user.level === 'number' ? user.level : getLevelFromXp(xp);

  const xpForCurrentLevel = level === 1 ? 0 : getXpRequired(level);
  const xpForNextLevel =
    level >= MAX_LEVEL ? null : getXpRequired(level + 1);
  const progress =
    level >= MAX_LEVEL || xpForNextLevel === null
      ? 100
      : Math.max(
          0,
          Math.min(
            100,
            (100 * (xp - xpForCurrentLevel)) /
              (xpForNextLevel - xpForCurrentLevel)
          )
        );

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
              <span>Level progress</span>
              <ChevronRightIcon className="size-3" />
            </div>
            <div className="flex items-center gap-1">
              <span>{progress.toFixed(2)}%</span>
              <CommonTooltip
                content={
                  <p>1 XP per 1 coin wagered. Level 1–100.</p>
                }
              >
                <InfoIcon className="size-3 cursor-pointer" />
              </CommonTooltip>
            </div>
          </div>
          <Progress className="h-2" value={progress} />
        </div>

        <div className="flex justify-between items-center text-xs mt-3">
          <div className="flex flex-col items-center gap-1">
            <StarIcon className="size-4 text-neutral-strong" />
            <span className="text-neutral-weak">Level {level}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <StarIcon className="size-4 text-yellow-400" fill="currentColor" />
            <span className="text-white font-medium">
              {level >= MAX_LEVEL ? 'Max' : `Level ${level + 1}`}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
