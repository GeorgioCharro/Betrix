import type { Prisma, ProvablyFairState, User } from '@prisma/client';
import db from '@repo/db';
import type { ProvablyFairStateResponse } from '@repo/common/types';
import {
  getGeneratedFloats,
  getHashedSeed,
  getHmacSeed,
} from '@repo/common/game-utils/provably-fair/utils.js';
import { BadRequestError } from '../../errors';
import { generateClientSeed, generateServerSeed } from './user.utils';

const MAX_LEVEL = 100;
const XP_PER_UNIT_WAGER = 1;

/**
 * XP required to reach a level: round(100 × level^1.5).
 * Deterministic, supports levels 1–100.
 */
export const getXpRequired = (level: number): number => {
  const clampedLevel = Math.min(Math.max(1, Math.floor(level)), MAX_LEVEL);
  return Math.round(100 * Math.pow(clampedLevel, 1.5));
};

/** Compute player level (1–100) from total XP using level-up loop. */
const getLevelFromXp = (xp: number): number => {
  let level = 1;
  while (level < MAX_LEVEL && xp >= getXpRequired(level + 1)) {
    level += 1;
  }
  return level;
};

const getXpGainForWager = (wagerAmount: number): number => {
  if (wagerAmount <= 0) return 0;
  return Math.floor(wagerAmount * XP_PER_UNIT_WAGER);
};

export const addPlayerXpInTransaction = async (
  tx: Prisma.TransactionClient,
  params: { userId: string; wagerAmount: number }
) => {
  const { userId, wagerAmount } = params;
  const xpGain = getXpGainForWager(wagerAmount);

  const updatedUser = await tx.user.update({
    where: { id: userId },
    data: {
      ...(xpGain > 0 && {
        xp: { increment: xpGain },
      }),
      totalWagered: { increment: wagerAmount },
    },
    select: { xp: true },
  });

  const level = getLevelFromXp(updatedUser.xp);

  await tx.user.update({
    where: { id: userId },
    data: { level },
  });

  const xpForNextLevel =
    level >= MAX_LEVEL ? null : getXpRequired(level + 1);
  const xpForCurrentLevel = level === 1 ? 0 : getXpRequired(level);
  const progressPercentage =
    level >= MAX_LEVEL || xpForNextLevel === null
      ? 100
      : Math.min(
          100,
          (100 *
            (updatedUser.xp - xpForCurrentLevel)) /
            (xpForNextLevel - xpForCurrentLevel)
        );

  return {
    level,
    totalXp: updatedUser.xp,
    xpForNextLevel,
    progressPercentage,
  };
};

export const addPlayerXp = async (userId: string, wagerAmount: number) => {
  return db.$transaction(async tx =>
    addPlayerXpInTransaction(tx, { userId, wagerAmount })
  );
};

export const getPlayerLevelProgress = async (userId: string) => {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { xp: true, level: true },
  });

  if (!user) {
    throw new BadRequestError('User not found');
  }

  const level = getLevelFromXp(user.xp);
  const xpForNextLevel =
    level >= MAX_LEVEL ? null : getXpRequired(level + 1);
  const xpForCurrentLevel = level === 1 ? 0 : getXpRequired(level);
  const progressPercentage =
    level >= MAX_LEVEL || xpForNextLevel === null
      ? 100
      : Math.min(
          100,
          (100 * (user.xp - xpForCurrentLevel)) /
            (xpForNextLevel - xpForCurrentLevel)
        );

  return {
    level,
    totalXp: user.xp,
    xpForNextLevel,
    progressPercentage,
  };
};

export class UserInstance {
  constructor(
    private user: User,
    private provablyFairState: ProvablyFairState
  ) {}

  setBalance(amount: string) {
    this.user.balance = amount;
  }

  getUser() {
    return this.user;
  }

  async rotateSeed(clientSeed: string): Promise<ProvablyFairStateResponse> {
    const activeBet = await db.bet.findFirst({
      where: { userId: this.user.id, active: true },
    });

    if (activeBet) {
      throw new BadRequestError('Cannot rotate seeds while a game is active');
    }
    const newServerSeed = this.generateNextServerSeed();
    const hashedServerSeed = getHashedSeed(newServerSeed);

    const result = await db.$transaction(async tx => {
      // Mark current seed as revealed
      await tx.provablyFairState.update({
        where: { id: this.provablyFairState.id },
        data: { revealed: true },
      });

      // Create new seeds
      const updated = await tx.provablyFairState.create({
        data: {
          serverSeed: newServerSeed,
          hashedServerSeed,
          clientSeed,
          revealed: false,
          nonce: 0,
          userId: this.user.id,
        },
      });

      // Update instance state
      this.provablyFairState = updated;

      return {
        clientSeed,
        hashedServerSeed: this.getHashedServerSeed(),
        hashedNextServerSeed: this.getHashedNextServerSeed(),
        nonce: updated.nonce,
      };
    });

    return result;
  }

  getBalance(): string {
    return this.user.balance;
  }

  // Convert balance to number for calculations when needed
  getBalanceAsNumber(): number {
    return parseInt(this.user.balance, 10);
  }

  async updateNonce(tx: Prisma.TransactionClient) {
    await tx.provablyFairState.update({
      where: { id: this.provablyFairState.id },
      data: { nonce: this.provablyFairState.nonce },
    });
    this.provablyFairState.nonce += 1;
  }

  getProvablyFairStateId() {
    return this.provablyFairState.id;
  }

  getServerSeed() {
    return this.provablyFairState.serverSeed;
  }

  getClientSeed() {
    return this.provablyFairState.clientSeed;
  }

  getNonce() {
    return this.provablyFairState.nonce;
  }

  getHashedServerSeed() {
    return getHashedSeed(this.provablyFairState.serverSeed);
  }

  getHashedNextServerSeed() {
    const nextServerSeed = this.generateNextServerSeed();
    return getHashedSeed(nextServerSeed);
  }

  private generateNextServerSeed(): string {
    return getHmacSeed(this.provablyFairState.serverSeed, 'next-seed');
  }

  generateFloats(count: number): number[] {
    return getGeneratedFloats({
      count,
      seed: this.provablyFairState.serverSeed,
      message: `${this.provablyFairState.clientSeed}:${this.provablyFairState.nonce}`,
    });
  }

  // Function to get a revealed server seed by its hash
  async getRevealedServerSeedByHash(
    hashedServerSeed: string
  ): Promise<string | null> {
    const revealedState = await db.provablyFairState.findFirst({
      where: {
        hashedServerSeed,
        revealed: true,
        userId: this.user.id,
      },
    });

    if (!revealedState) {
      return null;
    }

    return revealedState.serverSeed;
  }
}

class UserManager {
  private static instance: UserManager | undefined;
  private users = new Map<string, UserInstance>();

  static getInstance() {
    if (!UserManager.instance) {
      UserManager.instance = new UserManager();
    }
    return UserManager.instance;
  }

  async getUser(userId: string): Promise<UserInstance> {
    if (!this.users.has(userId)) {
      const user = await db.user.findUnique({
        where: { id: userId },
        include: {
          provablyFairStates: {
            where: {
              revealed: false,
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
        },
      });
      if (!user) {
        throw new BadRequestError('User not found');
      }
      if (!user.provablyFairStates[0]) {
        // Create initial provably fair state if it doesn't exist
        const provablyFairState = await db.provablyFairState.create({
          data: {
            userId: user.id,
            serverSeed: generateServerSeed(),
            clientSeed: generateClientSeed(),
            nonce: 0,
            revealed: false,
          },
        });
        user.provablyFairStates = [provablyFairState];
      }
      this.users.set(
        userId,
        new UserInstance(user, user.provablyFairStates[0])
      );
    }
    const user = this.users.get(userId);
    if (!user) {
      throw new BadRequestError('User not found in manager');
    }
    return user;
  }

  removeUser(userId: string) {
    this.users.delete(userId);
  }
}

export const userManager = UserManager.getInstance();

export const getUserBets = async ({
  userId,
  page = 1,
  pageSize = 10,
}: {
  userId: string;
  page?: number;
  pageSize?: number;
}) => {
  // Ensure valid pagination parameters
  const validPage = Math.max(1, page);
  const validPageSize = Math.min(100, Math.max(1, pageSize));

  // Get total count for pagination
  const totalCount = await db.bet.count({
    where: {
      userId,
    },
  });

  // Get paginated bets
  const bets = await db.bet.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    skip: (validPage - 1) * validPageSize,
    take: validPageSize,
  });

  // Calculate pagination metadata
  const totalPages = Math.ceil(totalCount / validPageSize);
  const hasNextPage = validPage < totalPages;
  const hasPreviousPage = validPage > 1;

  return {
    bets: bets.map(bet => ({
      userId: bet.userId,
      betId: bet.betId.toString().padStart(12, '0'),
      game: bet.game,
      createdAt: bet.createdAt,
      updatedAt: bet.updatedAt,
      betAmount: bet.betAmount / 100,
      payoutMultiplier: bet.payoutAmount / bet.betAmount,
      payout: bet.payoutAmount / 100,
      id: bet.id,
      betNonce: bet.betNonce,
      provablyFairStateId: bet.provablyFairStateId,
      state: JSON.stringify(bet.state),
    })),
    pagination: {
      page: validPage,
      pageSize: validPageSize,
      totalCount,
      totalPages,
      hasNextPage,
      hasPreviousPage,
    },
  };
};

export const addExperience = async ({
  userId,
  amount,
}: {
  userId: string;
  amount: number;
}) => {
  const result = await db.$transaction(async tx => {
    const updated = await tx.user.update({
      where: { id: userId },
      data: { xp: { increment: amount } },
      select: { xp: true },
    });

    const level = getLevelFromXp(updated.xp);

    const user = await tx.user.update({
      where: { id: userId },
      data: { level },
      select: {
        id: true,
        email: true,
        name: true,
        balance: true,
        xp: true,
        level: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  });

  return result;
};
