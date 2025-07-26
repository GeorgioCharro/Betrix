import * as userQueries from './modules/users/queries';
import * as userMutations from './modules/users/mutations';
import * as betQueries from './modules/bets/queries';
import * as depositQueries from './modules/deposits/queries';
import * as depositMutations from './modules/deposits/mutations';
import * as withdrawQueries from './modules/withdraws/queries';
import * as withdrawMutations from './modules/withdraws/mutations';
import * as gameQueries from './modules/games/queries';
import * as gameMutations from './modules/games/mutations';
import { MinesRoundResponse } from './modules/games/mines-round-response';

export const resolvers = {
  Query: {
    ...userQueries,
    ...betQueries,
    ...depositQueries,
    ...withdrawQueries,
    ...gameQueries,
  },
  Mutation: {
    ...userMutations,
    ...depositMutations,
    ...withdrawMutations,
    ...gameMutations,
  },
  MinesRoundResponse,
};
