import { resolvers as main } from './main';

export const withdrawsResolvers = {
  Query: {
    allWithdraws: main.Query.allWithdraws,
    withdraws: main.Query.withdraws,
  },
  Mutation: {
    withdrawBalance: main.Mutation.withdrawBalance,
  },
};
