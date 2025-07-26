import * as queries from './modules/withdraws/queries';
import * as mutations from './modules/withdraws/mutations';

export const withdrawsResolvers = {
  Query: {
    allWithdraws: queries.allWithdraws,
    withdraws: queries.withdraws,
  },
  Mutation: {
    withdrawBalance: mutations.withdrawBalance,
  },
};
