import { gql } from 'apollo-server-express';

export const usersTypeDefs = gql`
  enum Level {
    none
    vip
    vip_plus
    diamond
  }
  type User {
    id: ID!
    email: String!
    name: String
    picture: String
    balance: Float
    xp: Int!
    level: Level!
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
    xp: Int!
    level: Level!
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

    users(
      userId: ID
      start: String
      end: String
      page: Int!
      pageSize: Int!
    ): PaginatedUsersResponse
  }

  extend type Mutation {
    rotateSeed(clientSeed: String!): ProvablyFairState!
    addXp(amount: Int!, userId: ID): AdminUser!
  }
`;
