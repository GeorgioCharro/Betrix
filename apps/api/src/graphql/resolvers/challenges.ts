import * as queries from './modules/challenges/queries';
import * as mutations from './modules/challenges/mutations';

export const challengesResolvers = {
  Query: {
    challenges: queries.challenges,
  },
  Mutation: {
    addChallenge: mutations.addChallenge,
  },
};
