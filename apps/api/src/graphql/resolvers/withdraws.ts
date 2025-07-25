import { resolvers as main } from './main';

export const withdrawsResolvers = {
  Query: {
    allWithdraws: main.Query.allWithdraws,
    withdrawsByUser: main.Query.withdrawsByUser,
    withdrawsByTime: main.Query.withdrawsByTime,
  },
  Mutation: {
    withdrawBalance: main.Mutation.withdrawBalance,
  },
};
