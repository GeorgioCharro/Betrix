import { resolvers as main } from './main';

export const usersResolvers = {
  Query: {
    currentUser: main.Query.currentUser,
    balance: main.Query.balance,
    provablyFairState: main.Query.provablyFairState,
    revealedServerSeed: main.Query.revealedServerSeed,
    allUsers: main.Query.allUsers,
    users: main.Query.users,
  },
  Mutation: {
    rotateSeed: main.Mutation.rotateSeed,
  },
};
