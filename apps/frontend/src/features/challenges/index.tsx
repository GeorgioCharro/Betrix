import { useQuery } from '@tanstack/react-query';

import { fetchChallenges } from '@/api/challenges';
import { Banner } from '@/components/ui/banner';

import ChallengeCard from './components/ChallengeCard';

export default function Challenges(): JSX.Element {
  const { data } = useQuery({
    queryKey: ['challenges'],
    queryFn: fetchChallenges,
    placeholderData: prev => prev,
  });

  const challenges = data?.data ?? [];

  return (
    <div className="space-y-6 pb-6">
      <Banner
        iconSrc="/banner/group-banner-challenges.png"
        title="Challenges"
      />
      <div className="container">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {challenges.map(ch => (
            <ChallengeCard
              description={ch.description}
              imageSrc="/banner/casino.png"
              key={ch.id}
              name={ch.name}
              prize={ch.prize}
              progress={ch.progress}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
