import { MatchRoute, Outlet, createFileRoute } from '@tanstack/react-router';

import { CasesPage } from '@/cases/page';

export const Route = createFileRoute('/_public/cases')({
  component: () => (
    <>
      {/* Show the cases listing only on the exact /cases path */}
      <MatchRoute to="/cases" fuzzy={false}>
        <CasesPage />
      </MatchRoute>
      {/* Nested routes like /cases/open/$caseId render here */}
      <Outlet />
    </>
  ),
});

