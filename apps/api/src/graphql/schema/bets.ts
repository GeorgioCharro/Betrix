import { gql } from 'apollo-server-express';

export const betsTypeDefs = gql`
  type PaginatedBetData {
    userId: ID!
    betId: String!
    game: String!
    createdAt: String!
    updatedAt: String!
    betAmount: Float!
    payoutMultiplier: Float!
    payout: Float!
    id: ID!
    betNonce: Int!
    provablyFairStateId: ID!
    state: String!
  }

  type PaginatedBetsResponse {
    bets: [PaginatedBetData!]!
    pagination: Pagination!
  }

  extend type Query {
    userBetHistory(page: Int!, pageSize: Int!): PaginatedBetsResponse
    allBets(page: Int!, pageSize: Int!): PaginatedBetsResponse
    betsByUser(userId: ID!, page: Int!, pageSize: Int!): PaginatedBetsResponse
    betsByTime(
      start: String!
      end: String!
      page: Int!
      pageSize: Int!
    ): PaginatedBetsResponse
  }
`;
