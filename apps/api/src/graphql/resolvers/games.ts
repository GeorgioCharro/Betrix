import * as queries from './modules/games/queries';
import * as mutations from './modules/games/mutations';
import { MinesRoundResponse } from './modules/games/minesRoundResponse';

export const gamesResolvers = {
  Query: {
    activeMines: queries.activeMines,
    blackjackActive: queries.blackjackActive,
  },
  MinesRoundResponse,
  Mutation: {
    placeDiceBet: mutations.placeDiceBet,
    placeKenoBet: mutations.placeKenoBet,
    startMines: mutations.startMines,
    playMinesRound: mutations.playMinesRound,
    cashOutMines: mutations.cashOutMines,
    placeRouletteBet: mutations.placeRouletteBet,
    blackjackBet: mutations.blackjackBet,
    blackjackNext: mutations.blackjackNext,
    plinkooOutcome: mutations.plinkooOutcome,
    playLimbo: mutations.playLimbo,
  },
};
