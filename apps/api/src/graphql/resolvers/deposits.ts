import { resolvers as main } from './main';

export const depositsResolvers = {
  Query: {
    allDeposits: main.Query.allDeposits,
    deposits: main.Query.deposits,
  },
  Mutation: {
    depositBalance: main.Mutation.depositBalance,
  },
};
