import './index.css';
import { ApolloProvider } from '@apollo/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRouter, RouterProvider } from '@tanstack/react-router';

import { graphqlClient } from './api/graphql/client';
import type { AuthState } from './features/auth/store/authStore';
import { useAuthStore } from './features/auth/store/authStore';
import { routeTree } from './routeTree.gen';

const queryClient = new QueryClient();

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  context: {
    authStore: undefined,
  } as { authStore: AuthState | undefined },
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function App(): JSX.Element {
  const authStore = useAuthStore();

  return (
    <ApolloProvider client={graphqlClient}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider context={{ authStore }} router={router} />
      </QueryClientProvider>
    </ApolloProvider>
  );
}

export default App;
