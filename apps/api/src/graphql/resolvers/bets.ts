import { resolvers as main } from './main';

export const betsResolvers = {
  Query: {
    userBetHistory: main.Query.userBetHistory,
    allBets: main.Query.allBets,
    bets: main.Query.bets,
  },
};
