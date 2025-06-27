import { gql } from '@apollo/client';
import type {
  MinesGameOverResponse,
  MinesPlayRoundResponse,
} from '@repo/common/game-utils/mines/types.js';
import type { ApiResponse } from '@repo/common/types';

import { graphqlClient } from '../graphql/client';

const START_GAME = gql`
  mutation StartMines($betAmount: Float!, $minesCount: Int!) {
    startMines(betAmount: $betAmount, minesCount: $minesCount) {
      id
      active
      state {
        mines
        minesCount
        rounds {
          selectedTileIndex
          payoutMultiplier
        }
      }
      betAmount
    }
  }
`;

const PLAY_ROUND = gql`
  mutation PlayMinesRound($selectedTileIndex: Int!) {
    playMinesRound(selectedTileIndex: $selectedTileIndex) {
      ... on MinesPlayRoundResponse {
        id
        active
        hiddenState: state {
          mines
          minesCount
          rounds {
            selectedTileIndex
            payoutMultiplier
          }
        }
        betAmount
      }
      ... on MinesGameOverResponse {
        id
        active
        revealedState: state {
          mines
          minesCount
          rounds {
            selectedTileIndex
            payoutMultiplier
          }
        }
        payoutMultiplier
        payout
        balance
      }
    }
  }
`;

const CASH_OUT = gql`
  mutation CashOutMines {
    cashOutMines {
      id
      state {
        mines
        minesCount
        rounds {
          selectedTileIndex
          payoutMultiplier
        }
      }
      payoutMultiplier
      payout
      balance
      active
    }
  }
`;

const ACTIVE_GAME = gql`
  query ActiveMines {
    activeMines {
      id
      active
      state {
        mines
        minesCount
        rounds {
          selectedTileIndex
          payoutMultiplier
        }
      }
      betAmount
    }
  }
`;

export const startGame = async ({
  betAmount,
  minesCount,
}: {
  betAmount: number;
  minesCount: number;
}): Promise<ApiResponse<MinesPlayRoundResponse>> => {
  const { data } = await graphqlClient.mutate<{
    startMines: MinesPlayRoundResponse;
  }>({
    mutation: START_GAME,
    variables: { betAmount, minesCount },
  });
  if (!data) {
    throw new Error('Failed to start game');
  }
  return {
    data: data.startMines,
    statusCode: 200,
    message: 'Success',
    success: true,
  };
};

export const playRound = async (
  selectedTileIndex: number
): Promise<ApiResponse<MinesPlayRoundResponse | MinesGameOverResponse>> => {
  const { data } = await graphqlClient.mutate<{
    playMinesRound:
      | (MinesPlayRoundResponse & {
          hiddenState?: MinesPlayRoundResponse['state'];
        })
      | (MinesGameOverResponse & {
          revealedState?: MinesGameOverResponse['state'];
        });
  }>({
    mutation: PLAY_ROUND,
    variables: { selectedTileIndex },
  });

  if (!data) {
    throw new Error('Failed to play round');
  }

  const rawResult = data.playMinesRound;

  if ('hiddenState' in rawResult) {
    if (!rawResult.hiddenState) {
      throw new Error('Missing hiddenState in response');
    }
    return {
      data: {
        ...(rawResult as MinesPlayRoundResponse),
        state: rawResult.hiddenState,
      },
      statusCode: 200,
      message: 'Success',
      success: true,
    };
  }

  if ('revealedState' in rawResult) {
    if (!rawResult.revealedState) {
      throw new Error('Missing revealedState in response');
    }
    return {
      data: {
        ...(rawResult as MinesGameOverResponse),
        state: rawResult.revealedState,
      },
      statusCode: 200,
      message: 'Success',
      success: true,
    };
  }

  return {
    data: rawResult as MinesPlayRoundResponse | MinesGameOverResponse,
    statusCode: 200,
    message: 'Success',
    success: true,
  };
};

export const cashOut = async (): Promise<
  ApiResponse<MinesGameOverResponse>
> => {
  const { data } = await graphqlClient.mutate<{
    cashOutMines: MinesGameOverResponse;
  }>({
    mutation: CASH_OUT,
  });
  if (!data) {
    throw new Error('Failed to cash out');
  }
  return {
    data: data.cashOutMines,
    statusCode: 200,
    message: 'Success',
    success: true,
  };
};

export const getActiveGame = async (): Promise<
  ApiResponse<MinesPlayRoundResponse | undefined>
> => {
  const { data } = await graphqlClient.query<{
    activeMines: MinesPlayRoundResponse | undefined;
  }>({
    query: ACTIVE_GAME,
    fetchPolicy: 'no-cache',
  });
  return {
    data: data.activeMines,
    statusCode: 200,
    message: 'Success',
    success: true,
  };
};
