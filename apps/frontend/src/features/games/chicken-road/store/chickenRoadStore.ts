import type {
  ChickenRoadGameOverResponse,
  ChickenRoadPlayRoundResponse,
} from '@repo/common/game-utils/chicken-road/types.js';
import { create } from 'zustand';

export type ChickenRoadGameState =
  | ChickenRoadPlayRoundResponse
  | ChickenRoadGameOverResponse
  | null;

export type ChickenRoadDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

interface ChickenRoadStore {
  gameState: ChickenRoadGameState;
  setGameState: (state: ChickenRoadGameState) => void;
  betAmount: number;
  setBetAmount: (amount: number) => void;
  difficulty: ChickenRoadDifficulty;
  setDifficulty: (d: ChickenRoadDifficulty) => void;
}

const DEFAULT_BET_AMOUNT = 1;
const DEFAULT_DIFFICULTY: ChickenRoadDifficulty = 'medium';

export const useChickenRoadStore = create<ChickenRoadStore>(set => ({
  gameState: null,
  setGameState: gameState => set({ gameState }),
  betAmount: DEFAULT_BET_AMOUNT,
  setBetAmount: betAmount => set({ betAmount }),
  difficulty: DEFAULT_DIFFICULTY,
  setDifficulty: difficulty => set({ difficulty }),
}));
