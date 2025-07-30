import { createFileRoute } from '@tanstack/react-router';

import Challenges from '@/features/challenges';

export const Route = createFileRoute('/_protected/casino/challenges')({
  component: Challenges,
});
