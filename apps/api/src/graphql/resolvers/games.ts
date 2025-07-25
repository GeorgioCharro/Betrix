import { resolvers as main } from './main';

export const gamesResolvers = {
  Query: {
    activeMines: main.Query.activeMines,
    blackjackActive: main.Query.blackjackActive,
  },
  MinesRoundResponse: main.MinesRoundResponse,
  Mutation: {
    placeDiceBet: main.Mutation.placeDiceBet,
    placeKenoBet: main.Mutation.placeKenoBet,
    startMines: main.Mutation.startMines,
    playMinesRound: main.Mutation.playMinesRound,
    cashOutMines: main.Mutation.cashOutMines,
    placeRouletteBet: main.Mutation.placeRouletteBet,
    blackjackBet: main.Mutation.blackjackBet,
    blackjackNext: main.Mutation.blackjackNext,
    plinkooOutcome: main.Mutation.plinkooOutcome,
    playLimbo: main.Mutation.playLimbo,
  },
};
