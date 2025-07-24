import { resolvers as main } from './main';

export const betsResolvers = {
  Query: {
    userBetHistory: main.Query.userBetHistory,
    allBets: main.Query.allBets,
    betsByUser: main.Query.betsByUser,
    betsByTime: main.Query.betsByTime,
  },
};
