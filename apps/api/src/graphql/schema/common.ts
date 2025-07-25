import { gql } from 'apollo-server-express';

export const commonTypeDefs = gql`
  type Pagination {
    page: Int!
    pageSize: Int!
    totalCount: Int!
    totalPages: Int!
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
  }
  type Query {
    _empty: String
  }

  type Mutation {
    _empty: String
  }
`;
