import { resolvers as main } from './main';

export const usersResolvers = {
  Query: {
    currentUser: main.Query.currentUser,
    balance: main.Query.balance,
    provablyFairState: main.Query.provablyFairState,
    revealedServerSeed: main.Query.revealedServerSeed,
    allUsers: main.Query.allUsers,
    usersByTime: main.Query.usersByTime,
  },
  Mutation: {
    rotateSeed: main.Mutation.rotateSeed,
  },
};
