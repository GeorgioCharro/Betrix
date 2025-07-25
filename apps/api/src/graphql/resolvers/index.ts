import { betsResolvers } from './bets';
import { gamesResolvers } from './games';
import { usersResolvers } from './users';
import { depositsResolvers } from './deposits';
import { withdrawsResolvers } from './withdraws';

export const resolvers = {
  Query: {
    ...betsResolvers.Query,
    ...gamesResolvers.Query,
    ...usersResolvers.Query,
    ...depositsResolvers.Query,
    ...withdrawsResolvers.Query,
  },
  Mutation: {
    ...gamesResolvers.Mutation,
    ...usersResolvers.Mutation,
    ...depositsResolvers.Mutation,
    ...withdrawsResolvers.Mutation,
  },
  MinesRoundResponse: gamesResolvers.MinesRoundResponse,
};
