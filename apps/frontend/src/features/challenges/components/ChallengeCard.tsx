import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export interface ChallengeCardProps {
  imageSrc: string;
  name: string;
  description: string;
  prize: string | number;
  progress?: number;
}

export default function ChallengeCard({
  imageSrc,
  name,
  description,
  prize,
  progress = 0,
}: ChallengeCardProps): JSX.Element {
  return (
    <Card className="overflow-hidden w-[300px]">
      <img alt={name} className="w-full h-32 object-cover" src={imageSrc} />
      <div className="bg-brand-weak p-3 text-center space-y-1">
        <h3 className="font-semibold text-neutral-default">{name}</h3>
        <p className="text-sm text-neutral-weak">{description}</p>
        <p className="font-bold text-neutral-default">Prize: {prize}</p>
        <div className="mt-2 space-y-1">
          <span className="text-xs text-neutral-default font-medium">
            {(progress * 100).toFixed(0)}%
          </span>
          <Progress className="h-2" value={progress * 100} />
        </div>
      </div>
    </Card>
  );
}
