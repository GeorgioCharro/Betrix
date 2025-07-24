import { resolvers as main } from './main';

export const depositsResolvers = {
  Query: {
    allDeposits: main.Query.allDeposits,
    depositsByUser: main.Query.depositsByUser,
    depositsByTime: main.Query.depositsByTime,
  },
  Mutation: {
    depositBalance: main.Mutation.depositBalance,
  },
};
