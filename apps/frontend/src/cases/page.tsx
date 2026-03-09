import { useState } from 'react';

import { cases } from './data/cases';
import { CaseCard } from './components/CaseCard';
import { Header } from '@/components/Header';
import { SideMenu } from '@/components/SideMenu';
import { useAuthStore } from '@/features/auth/store/authStore';

export function CasesPage(): JSX.Element {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user } = useAuthStore();

  const toggleMenu = (): void => {
    setIsMenuOpen(open => !open);
  };

  return (
    <div className="flex min-h-screen">
      <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="container mx-auto flex-1 py-6">
          <h1 className="mb-4 text-2xl font-semibold text-white">Cases</h1>
          <p className="mb-6 text-sm text-neutral-400">
            Open provably fair cases and win skins. Results are determined before
            the animation using server seed, client seed, and nonce.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {cases.map(c => (
              <CaseCard
                key={c.id}
                caseDef={c}
                disabled={!user}
              />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

