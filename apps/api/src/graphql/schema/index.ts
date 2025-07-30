import { gql } from 'apollo-server-express';
import { gamesTypeDefs } from './games';
import { usersTypeDefs } from './users';
import { betsTypeDefs } from './bets';
import { depositsTypeDefs } from './deposits';
import { withdrawsTypeDefs } from './withdraws';
import { challengesTypeDefs } from './challenges';
import { commonTypeDefs } from './common';

export const typeDefs = gql`
  ${commonTypeDefs}
  ${gamesTypeDefs}
  ${usersTypeDefs}
  ${betsTypeDefs}
  ${depositsTypeDefs}
  ${withdrawsTypeDefs}
  ${challengesTypeDefs}
`;
