import { Games } from '@/const/games';

export interface GameDescriptionInfo {
  title: string;
  description: string;
  image: string;
}

export const GAME_DESCRIPTIONS: Record<Games, GameDescriptionInfo> = {
  [Games.DICE]: {
    title: 'Dice',
    description:
      'Roll the dice and predict whether the outcome will be above or below your target.',
    image: '/games/dice/dice-icon.png',
  },
  [Games.ROULETTE]: {
    title: 'Roulette',
    description:
      'Place your bets on numbers or colors and watch the wheel decide your fate.',
    image: '/games/roulette/roulette-icon.png',
  },
  [Games.MINES]: {
    title: 'Mines',
    description:
      'Join in on the Mines fever with one of our most popular and beloved games at Betrix Casino! Inspired by the classic Minesweeper, Mines will simply reveal the gems and avoid the bombs to increase your payout multiplier.Mines is a grid-based gambling game of chance, where players navigate the grid to reveal gems while avoiding bombs! This Mines betting game is played on a 5x5 grid in which players can flip the tiles over to show either a gem or a bomb.Revealing gems increases payout multipliers and allows players to continue playing, choosing to pick additional tiles, a random tile or cash out. Revealing a bomb ends the round with the wager lost.With the freedom to adjust the number of mines, autobet and cash out at any point in the game, the gambling experience offered by Mines is second to none at any online casino!',
    image: '/games/mines/mines-icon.png',
  },
  [Games.KENO]: {
    title: 'Keno',
    description:
      'Select your lucky numbers and hope they match the drawn balls for big rewards.',
    image: '/games/keno/keno-icon.png',
  },
  [Games.BLACKJACK]: {
    title: 'Blackjack',
    description:
      'Try to beat the dealer by getting as close to 21 as possible without busting.',
    image: '/games/blackjack/blackjack-icon.png',
  },
  [Games.PLINKOO]: {
    title: 'Plinkoo',
    description:
      'Drop balls through the board and aim for the highest multipliers at the bottom.',
    image: '/games/plinkoo/plinkoo-icon.png',
  },
  [Games.CHICKEN_ROAD]: {
    title: 'Rocket',
    description:
      'Launch your rocket and advance step by step. Each click moves you to the next multiplier. Cash out anytime—if you push too far, the rocket explodes and you lose the round.',
    image: '/games/dice/loading-dice.png',
  },
  [Games.LIMBO]: {
    title: 'Limbo',
    description:
      'Choose your target multiplier and try to cash in before the game crashes. Higher targets mean higher rewards but lower chances of winning.',
    image: '/games/dice/dice-icon.png',
  },
};
