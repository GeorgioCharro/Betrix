import { gql } from 'apollo-server-express';

export const challengesTypeDefs = gql`
  type Challenge {
    id: ID!
    challengeId: String!
    code: String!
    name: String!
    description: String!
    prize: Int!
    userWon: Boolean!
    progress: Float!
    createdAt: String!
    updatedAt: String!
  }

  extend type Query {
    challenges: [Challenge!]!
  }

  extend type Mutation {
    addChallenge(
      code: String!
      name: String!
      description: String!
      prize: Int!
    ): Challenge!
  }
`;
