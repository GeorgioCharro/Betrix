import * as queries from './modules/users/queries';
import * as mutations from './modules/users/mutations';

export const usersResolvers = {
  Query: {
    currentUser: queries.currentUser,
    balance: queries.balance,
    provablyFairState: queries.provablyFairState,
    revealedServerSeed: queries.revealedServerSeed,
    allUsers: queries.allUsers,
    users: queries.users,
    usersByTime: queries.usersByTime,
  },
  Mutation: {
    rotateSeed: mutations.rotateSeed,
  },
};
