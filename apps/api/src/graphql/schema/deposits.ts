import { gql } from 'apollo-server-express';

export const depositsTypeDefs = gql`
  type PaginatedDepositData {
    userId: ID!
    depositId: String!
    amount: Float!
    status: String!
    depositAddress: String!
    createdAt: String!
    updatedAt: String!
    id: ID!
  }

  type PaginatedDepositsResponse {
    deposits: [PaginatedDepositData!]!
    pagination: Pagination!
  }

  extend type Query {
    allDeposits(page: Int!, pageSize: Int!): PaginatedDepositsResponse

    deposits(
      userId: ID
      start: String
      end: String
      page: Int!
      pageSize: Int!
    ): PaginatedDepositsResponse
  }

  extend type Mutation {
    depositBalance(
      userId: ID!
      amount: Float!
      depositAddress: String
      status: String
    ): BalanceResponse!
  }
`;
