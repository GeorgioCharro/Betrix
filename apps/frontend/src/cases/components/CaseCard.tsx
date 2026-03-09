import { Link } from '@tanstack/react-router';
import { StarIcon } from 'lucide-react';

import type { CaseDefinition } from '../data/cases';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type CaseCardProps = {
  caseDef: CaseDefinition;
  disabled?: boolean;
};

export function CaseCard({ caseDef, disabled }: CaseCardProps): JSX.Element {
  return (
    <Card className="flex flex-col items-center gap-3 bg-slate-950 border border-border/70 p-4 shadow-md">
      {/* Case image, shown on a clean dark card background without extra gradients */}
      <div className="flex h-32 w-full items-center justify-center overflow-visible">
        <img
          src={caseDef.image}
          alt={caseDef.name}
          className="h-full max-h-28 w-auto object-contain"
          loading="lazy"
        />
      </div>

      <div className="flex w-full flex-col items-center gap-1 text-center">
        <div className="flex items-center gap-1 text-xs font-semibold text-white">
          <StarIcon className="size-3 text-yellow-400" />
          <span>{caseDef.name}</span>
        </div>
        <div className="flex w-full items-center justify-between text-xs text-neutral-weak">
          <span>Price</span>
          <span className="font-semibold text-white">
            {caseDef.price.toFixed(2)} coins
          </span>
        </div>
      </div>

      <Button className="w-full mt-1" asChild disabled={disabled}>
        <Link to={`/cases/open/${caseDef.id}`}>Open Case</Link>
      </Button>
    </Card>
  );
}

