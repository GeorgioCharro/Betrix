export type CaseItem = {
  name: string;
  chance: number;
  value: number;
  image?: string;
  isGold?: boolean;
};

export type ProvablyFairCaseData = {
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  roll: number;
};

export type OpenCaseResultItem = {
  winningItem: CaseItem;
  caseOpenId: string;
};

export type OpenCaseApiResponse = {
  caseId: string;
  winningItem?: CaseItem;
  caseOpenId?: string;
  provablyFair?: ProvablyFairCaseData;
  balance: number;
  results: OpenCaseResultItem[];
};

export type CompleteCaseApiResponse = {
  caseId: string;
  winningItem: CaseItem;
  balance: number;
};

