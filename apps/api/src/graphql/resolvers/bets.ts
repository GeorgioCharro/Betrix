import * as queries from './modules/bets/queries';

export const betsResolvers = {
  Query: {
    userBetHistory: queries.userBetHistory,
    allBets: queries.allBets,
    bets: queries.bets,
  },
};
