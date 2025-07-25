import { gql } from 'apollo-server-express';

export const withdrawsTypeDefs = gql`
  type PaginatedWithdrawData {
    userId: ID!
    withdrawId: String!
    amount: Float!
    status: String!
    withdrawAddress: String!
    createdAt: String!
    updatedAt: String!
    id: ID!
  }

  type PaginatedWithdrawsResponse {
    withdraws: [PaginatedWithdrawData!]!
    pagination: Pagination!
  }

  extend type Query {
    allWithdraws(page: Int!, pageSize: Int!): PaginatedWithdrawsResponse
    withdrawsByUser(
      userId: ID!
      page: Int!
      pageSize: Int!
    ): PaginatedWithdrawsResponse
    withdrawsByTime(
      start: String!
      end: String!
      page: Int!
      pageSize: Int!
    ): PaginatedWithdrawsResponse
  }

  extend type Mutation {
    withdrawBalance(
      userId: ID!
      amount: Float!
      withdrawAddress: String
      status: String
    ): BalanceResponse!
  }
`;
