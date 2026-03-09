import { createFileRoute } from '@tanstack/react-router';

import { CaseOpenPage } from '@/cases/open-page';

export const Route = createFileRoute('/_public/cases/open/$caseId')({
  component: () => {
    const { caseId } = Route.useParams();
    return <CaseOpenPage caseId={caseId} />;
  },
});

