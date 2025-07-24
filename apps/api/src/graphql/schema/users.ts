import { gql } from 'apollo-server-express';

export const usersTypeDefs = gql`
  type User {
    id: ID!
    email: String!
    name: String!
    picture: String
    balance: Float
  }

  type ProvablyFairState {
    clientSeed: String!
    hashedServerSeed: String!
    hashedNextServerSeed: String!
    nonce: Int!
  }

  type RevealedServerSeed {
    serverSeed: String
  }

  type AdminUser {
    id: ID!
    email: String!
    name: String
    balance: Float!
    createdAt: String!
    updatedAt: String!
  }

  type PaginatedUsersResponse {
    users: [AdminUser!]!
    pagination: Pagination!
  }

  type BalanceResponse {
    balance: Float!
  }

  extend type Query {
    currentUser: User
    balance: Float
    provablyFairState: ProvablyFairState
    revealedServerSeed(hashedServerSeed: String!): RevealedServerSeed
    allUsers(page: Int!, pageSize: Int!): PaginatedUsersResponse
    usersByTime(
      start: String!
      end: String!
      page: Int!
      pageSize: Int!
    ): PaginatedUsersResponse
  }

  extend type Mutation {
    rotateSeed(clientSeed: String!): ProvablyFairState!
  }
`;
