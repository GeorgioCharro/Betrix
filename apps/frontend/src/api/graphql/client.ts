import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';

import { BASE_API_URL } from '@/const/routes';

const httpLink = createHttpLink({ uri: `${BASE_API_URL  }/graphql`, credentials: 'include' });

export const graphqlClient = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
});