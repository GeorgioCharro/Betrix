import { gql } from 'apollo-server-express';

export const gamesTypeDefs = gql`
  enum DiceCondition {
    above
    below
  }

  type DiceResultState {
    target: Float!
    condition: DiceCondition!
    result: Float!
  }

  type DicePlaceBetResponse {
    id: ID!
    state: DiceResultState!
    payoutMultiplier: Float!
    payout: Float!
    balance: Float!
  }

  enum KenoRisk {
    low
    medium
    high
    classic
  }

  enum PlinkooRisk {
    Low
    Medium
    High
  }

  type KenoState {
    risk: KenoRisk!
    selectedTiles: [Int!]!
    drawnNumbers: [Int!]!
  }

  type KenoResponse {
    id: ID!
    state: KenoState!
    payoutMultiplier: Float!
    payout: Float!
    balance: Float!
  }

  type MinesRound {
    selectedTileIndex: Int!
    payoutMultiplier: Float!
  }

  type MinesHiddenState {
    mines: [Int]
    minesCount: Int!
    rounds: [MinesRound!]!
  }

  type MinesRevealedState {
    mines: [Int!]!
    minesCount: Int!
    rounds: [MinesRound!]!
  }

  type MinesPlayRoundResponse {
    id: ID!
    state: MinesHiddenState!
    active: Boolean!
    betAmount: Float!
  }

  type MinesGameOverResponse {
    id: ID!
    state: MinesRevealedState!
    payoutMultiplier: Float!
    payout: Float!
    balance: Float!
    active: Boolean!
  }
  union MinesRoundResponse = MinesPlayRoundResponse | MinesGameOverResponse

  enum ChickenRoadDifficulty {
    easy
    medium
    hard
    expert
  }

  """State for active round only – no future outcomes exposed."""
  type ChickenRoadActiveState {
    hopsCompleted: Int!
  }

  """State revealed after game over – for provably fair verification."""
  type ChickenRoadRevealedState {
    outcomes: [Boolean!]!
    hopsCompleted: Int!
  }

  type ChickenRoadPlayRoundResponse {
    id: ID!
    state: ChickenRoadActiveState!
    active: Boolean!
    betAmount: Float!
    currentMultiplier: Float!
    hopsCompleted: Int!
    difficulty: ChickenRoadDifficulty
  }

  type ChickenRoadGameOverResponse {
    id: ID!
    state: ChickenRoadRevealedState!
    payoutMultiplier: Float!
    payout: Float!
    balance: Float!
    active: Boolean!
    crashedAtHop: Int
  }

  union ChickenRoadRoundResponse =
      ChickenRoadPlayRoundResponse
    | ChickenRoadGameOverResponse

  input RouletteBetInput {
    betType: String!
    selection: [Int!]
    amount: Float!
  }

  type RouletteBet {
    betType: String!
    selection: [Int!]
    amount: Float!
  }

  type RouletteBetState {
    bets: [RouletteBet!]!
    winningNumber: String!
  }

  type RoulettePlaceBetResponse {
    id: ID!
    state: RouletteBetState!
    payoutMultiplier: Float!
    payout: Float!
    balance: Float!
  }

  type BlackjackCard {
    suit: String!
    rank: String!
  }

  type BlackjackPlayerState {
    actions: [String!]!
    value: Int!
    cards: [BlackjackCard!]!
  }

  type BlackjackDealerState {
    actions: [String!]!
    value: Int!
    cards: [BlackjackCard!]!
  }

  type BlackjackGameState {
    player: [BlackjackPlayerState!]!
    dealer: BlackjackDealerState!
  }

  type BlackjackPlayRoundResponse {
    id: ID!
    state: BlackjackGameState!
    active: Boolean!
    betAmount: Float!
    amountMultiplier: Float!
    payout: Float
    payoutMultiplier: Float
    balance: Float
  }

  type PlinkooResult {
    point: Int!
    multiplier: Float!
    pattern: [String!]!
  }
  type PlinkooBetResponse {
    id: ID!
    state: PlinkooResult!
    payoutMultiplier: Float!
    payout: Float!
    balance: Float!
  }

  type LimboState {
    targetMultiplier: Float!
    roll: Float!
    winChance: Float!
  }

  type LimboBetResponse {
    id: ID!
    state: LimboState!
    payoutMultiplier: Float!
    payout: Float!
    balance: Float!
  }

  extend type Query {
    activeMines: MinesPlayRoundResponse
    activeChickenRoad: ChickenRoadPlayRoundResponse
    blackjackActive: BlackjackPlayRoundResponse
  }

  extend type Mutation {
    placeDiceBet(
      target: Float!
      condition: DiceCondition!
      betAmount: Float!
    ): DicePlaceBetResponse!
    placeKenoBet(
      betAmount: Float!
      selectedTiles: [Int!]!
      risk: String!
    ): KenoResponse!
    startMines(betAmount: Float!, minesCount: Int!): MinesPlayRoundResponse!
    playMinesRound(selectedTileIndex: Int!): MinesRoundResponse!
    cashOutMines: MinesGameOverResponse!
    startChickenRoad(betAmount: Float!, difficulty: ChickenRoadDifficulty): ChickenRoadPlayRoundResponse!
    crossChickenRoad: ChickenRoadRoundResponse!
    cashOutChickenRoad: ChickenRoadGameOverResponse!
    placeRouletteBet(bets: [RouletteBetInput!]!): RoulettePlaceBetResponse!
    blackjackBet(betAmount: Float!): BlackjackPlayRoundResponse!
    blackjackNext(action: String!): BlackjackPlayRoundResponse!
    plinkooOutcome(
      clientSeed: String
      betamount: Float!
      rows: Int!
      risk: PlinkooRisk!
    ): PlinkooBetResponse!
    playLimbo(clientSeed: String): Float!
    placeLimboBet(betAmount: Float!, targetMultiplier: Float!): LimboBetResponse!
  }
`;
