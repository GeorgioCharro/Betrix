import { Banner } from '@/components/ui/banner';

import { CasinoStats } from './components/CasinoStats';
import { FeaturedGames } from './components/FeaturedGames';

export default function Home(): JSX.Element {
  return (
    <div className="space-y-6 pb-6">
      <Banner iconSrc="/banner/group-banner.png" title="Casino" />
      <FeaturedGames />
      <CasinoStats />
    </div>
  );
}
