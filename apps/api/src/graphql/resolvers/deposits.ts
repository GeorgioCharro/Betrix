import * as queries from './modules/deposits/queries';
import * as mutations from './modules/deposits/mutations';

export const depositsResolvers = {
  Query: {
    allDeposits: queries.allDeposits,
    deposits: queries.deposits,
  },
  Mutation: {
    depositBalance: mutations.depositBalance,
  },
};
