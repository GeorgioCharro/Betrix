
import { gql } from '@apollo/client';

import { graphqlClient } from './graphql/client';



const BALANCE_QUERY = gql`
  query Balance {
    balance
  }
`;

export const getBalance = async (): Promise<number> => {
  const { data } = await graphqlClient.query<{ balance: number }>({
    query: BALANCE_QUERY,
    fetchPolicy: 'no-cache',
  });
  return data.balance;
};