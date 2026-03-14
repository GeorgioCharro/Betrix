import { Banner } from '@/components/ui/banner';

import { CasinoStats } from './components/CasinoStats';
import { FeaturedGames } from './components/FeaturedGames';

export default function Home(): JSX.Element {
  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col sm:flex-row gap-4 w-full">
        <Banner
          className="flex-1"
          iconSrc="/banner/group-banner.png"
          title="Casino"
        />
        <Banner
          className="flex-1"
          iconSrc="/banner/cases banner.png"
          title="Cases"
        />
      </div>
      <FeaturedGames />
      <CasinoStats />
    </div>
  );
}
