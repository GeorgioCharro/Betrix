import { betsResolvers } from './bets';
import { gamesResolvers } from './games';
import { usersResolvers } from './users';
import { depositsResolvers } from './deposits';
import { withdrawsResolvers } from './withdraws';
import { challengesResolvers } from './challenges';

export const resolvers = {
  Query: {
    ...betsResolvers.Query,
    ...gamesResolvers.Query,
    ...usersResolvers.Query,
    ...challengesResolvers.Query,
    ...depositsResolvers.Query,
    ...withdrawsResolvers.Query,
  },
  Mutation: {
    ...gamesResolvers.Mutation,
    ...usersResolvers.Mutation,
    ...depositsResolvers.Mutation,
    ...withdrawsResolvers.Mutation,
    ...challengesResolvers.Mutation,
  },
  MinesRoundResponse: gamesResolvers.MinesRoundResponse,
  ChickenRoadRoundResponse: gamesResolvers.ChickenRoadRoundResponse,
};
