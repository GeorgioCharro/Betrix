import * as queries from './modules/games/queries';
import * as mutations from './modules/games/mutations';
import { MinesRoundResponse } from './modules/games/mines-round-response';
import { ChickenRoadRoundResponse } from './modules/games/chicken-road-round-response';

export const gamesResolvers = {
  Query: {
    activeMines: queries.activeMines,
    activeChickenRoad: queries.activeChickenRoad,
    blackjackActive: queries.blackjackActive,
  },
  MinesRoundResponse,
  ChickenRoadRoundResponse,
  Mutation: {
    placeDiceBet: mutations.placeDiceBet,
    placeKenoBet: mutations.placeKenoBet,
    placeLimboBet: mutations.placeLimboBet,
    startMines: mutations.startMines,
    playMinesRound: mutations.playMinesRound,
    cashOutMines: mutations.cashOutMines,
    startChickenRoad: mutations.startChickenRoad,
    crossChickenRoad: mutations.crossChickenRoad,
    cashOutChickenRoad: mutations.cashOutChickenRoad,
    placeRouletteBet: mutations.placeRouletteBet,
    blackjackBet: mutations.blackjackBet,
    blackjackNext: mutations.blackjackNext,
    plinkooOutcome: mutations.plinkooOutcome,
    playLimbo: mutations.playLimbo,
  },
};
