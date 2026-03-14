import { Fragment, useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { cases, type CaseDefinition } from './data/cases';
import { CaseOpeningAnimation } from './components/CaseOpeningAnimation';
import { CaseContainsItemRow } from './components/CaseContainsItemRow';
import type {
  CompleteCaseApiResponse,
  OpenCaseApiResponse,
  OpenCaseResultItem,
} from './utils/provablyFair';
import { Header } from '@/components/Header';
import { SideMenu } from '@/components/SideMenu';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/features/auth/store/authStore';
import { BASE_API_URL } from '@/const/routes';

const CASE_AMOUNT_OPTIONS = [1, 2, 3, 4] as const;
const ROW_DURATION_BASE = 4;
const ROW_DURATION_STAGGER = 0.2;
const SPINNER_SLOT_WIDTH = 120;
const SPINNER_SLOT_HEIGHT = 300;
const SPINNER_MIN_HEIGHT = 280;
const DIVIDER_WIDTH_PX = 1;

type CaseOpenPageProps = {
  caseId: string;
};

export function CaseOpenPage({ caseId }: CaseOpenPageProps): JSX.Element {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [caseAmount, setCaseAmount] = useState(1);
  const [isOpening, setIsOpening] = useState(false);
  const [results, setResults] = useState<OpenCaseResultItem[] | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const queryClient = useQueryClient();
  const { user, setUser } = useAuthStore();
  const spinnersContainerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    if (caseAmount <= 1 || !spinnersContainerRef.current) return;
    const el = spinnersContainerRef.current;
    const ro = new ResizeObserver(entries => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setContainerSize({ width: Math.floor(width), height: Math.floor(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [caseAmount]);

  const verticalSlotSize =
    containerSize && caseAmount > 0
      ? {
          width: Math.max(
            60,
            Math.floor(
              (containerSize.width - (caseAmount - 1) * DIVIDER_WIDTH_PX) /
                caseAmount
            )
          ),
          height: Math.max(SPINNER_MIN_HEIGHT, containerSize.height),
        }
      : { width: SPINNER_SLOT_WIDTH, height: SPINNER_SLOT_HEIGHT };

  const toggleMenu = (): void => {
    setIsMenuOpen(open => !open);
  };

  const caseDef: CaseDefinition | undefined = cases.find(c => c.id === caseId);

  const hasPendingCompletes =
    results !== null && completedCount < results.length;
  const isBusy = isOpening || hasPendingCompletes;
  const totalPrice = caseDef ? caseDef.price * caseAmount : 0;

  const handleOpen = async () => {
    if (!user || !caseDef || isBusy) return;
    setIsOpening(true);

    try {
      const response = await fetch(`${BASE_API_URL}/api/cases/open`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, amount: caseAmount }),
      });
      if (!response.ok) throw new Error('Failed to open case');

      const data = (await response.json()) as { data: OpenCaseApiResponse };
      const openResults = data.data.results ?? [];

      if (openResults.length === 0) throw new Error('No results');

      setCompletedCount(0);
      setResults(openResults);
      queryClient.setQueryData(['balance'], data.data.balance);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    } finally {
      setIsOpening(false);
    }
  };

  const handleRowComplete = (index: number) => {
    if (!user || !results || index < 0 || index >= results.length) return;
    const { caseOpenId } = results[index];

    (async () => {
      try {
        const response = await fetch(`${BASE_API_URL}/api/cases/complete`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ caseOpenId }),
        });
        if (!response.ok) throw new Error('Failed to complete case');
        const resData = (await response.json()) as {
          data: CompleteCaseApiResponse;
        };

        queryClient.setQueryData(['balance'], resData.data.balance);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      } finally {
        setCompletedCount(c => c + 1);
      }
    })();
  };

  if (!caseDef) {
    return (
      <div className="flex min-h-screen">
        <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
        <div className="flex flex-1 flex-col">
          <Header />
          <main className="container mx-auto flex-1 py-6">
            <h1 className="text-xl font-semibold text-white">Case not found</h1>
          </main>
        </div>
      </div>
    );
  }

  const showPlaceholder = !results || results.length === 0;

  return (
    <div className="flex min-h-screen">
      <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="container mx-auto flex-1 py-6 space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">
                {caseDef.name}
              </h1>
              <p className="text-sm text-neutral-400">
                Open this case to win one of the items below. The result is
                provably fair using server seed, client seed, and nonce.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex rounded-md border border-border bg-slate-800/80 overflow-hidden">
                {CASE_AMOUNT_OPTIONS.map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCaseAmount(n)}
                    className={`min-w-[2.5rem] px-3 py-2 text-sm font-medium transition-colors ${
                      caseAmount === n
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-800 text-neutral-300 hover:bg-slate-700'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <Button
                disabled={!user || isBusy}
                onClick={handleOpen}
                className="min-w-[6rem]"
              >
                Open
              </Button>
            </div>
          </div>

          {/* 1 case = horizontal spin; 2+ cases = vertical spin */}
          <div className="flex flex-1 flex-col gap-3 min-h-0">
            {caseAmount > 1 ? (
              <div
                ref={spinnersContainerRef}
                className="caseSpinners flex flex-1 flex-row items-stretch w-full min-h-[320px] rounded-md border border-border bg-slate-900/80 overflow-hidden"
              >
                {Array.from({ length: caseAmount }).map((_, index) => {
                  const result = results?.[index];
                  return (
                    <Fragment key={result?.caseOpenId ?? `placeholder-${index}`}>
                      <div
                        className="flex-1 min-w-0 flex flex-col"
                        style={{ height: verticalSlotSize.height }}
                      >
                        <CaseOpeningAnimation
                          winningItem={result?.winningItem ?? null}
                          isOpen={!!result}
                          caseItems={caseDef.items}
                          onComplete={
                            result
                              ? () => handleRowComplete(index)
                              : undefined
                          }
                          duration={ROW_DURATION_BASE + index * ROW_DURATION_STAGGER}
                          orientation="vertical"
                          slotSize={verticalSlotSize}
                          embeddedInGroup
                          caseImage={caseDef.image}
                        />
                      </div>
                      {index < caseAmount - 1 && (
                        <div
                          className="w-px flex-shrink-0 bg-border self-stretch"
                          aria-hidden
                        />
                      )}
                    </Fragment>
                  );
                })}
              </div>
            ) : (
              <div className="flex max-h-[420px] flex-col gap-3 overflow-y-auto rounded-md">
                {showPlaceholder && (
                  <CaseOpeningAnimation
                    winningItem={null}
                    isOpen={false}
                    caseItems={caseDef.items}
                    onComplete={undefined}
                    orientation="horizontal"
                    caseImage={caseDef.image}
                  />
                )}
                {results?.map((result, index) => (
                  <CaseOpeningAnimation
                    key={result.caseOpenId}
                    winningItem={result.winningItem}
                    isOpen={true}
                    caseItems={caseDef.items}
                    onComplete={() => handleRowComplete(index)}
                    duration={ROW_DURATION_BASE + index * ROW_DURATION_STAGGER}
                    compact={results.length > 1}
                    orientation="horizontal"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Case contents */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Case contains</h2>
            <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {caseDef.items.map(item => (
                <CaseContainsItemRow key={item.name} item={item} />
              ))}
            </div>
          </section>

          {results && results.length > 0 ? (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-white">You won</h2>
              <div className="flex flex-wrap gap-2">
                {results.map((r, i) => (
                  <Card
                    key={r.caseOpenId}
                    className="inline-flex flex-col gap-1 bg-emerald-900/40 border border-emerald-500 px-4 py-3 text-xs"
                  >
                    <span className="font-semibold text-white">
                      {r.winningItem.name}
                    </span>
                    <span className="text-neutral-300">
                      Value:{' '}
                      <span className="font-semibold text-white">
                        {r.winningItem.value.toFixed(2)} coins
                      </span>
                    </span>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}
