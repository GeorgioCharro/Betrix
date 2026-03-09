import type { Request, Response } from 'express';
import type { User } from '@prisma/client';
import db from '@repo/db';
import { StatusCodes } from 'http-status-codes';
import { ApiResponse } from '@repo/common/types';
import { BadRequestError } from '../../errors';
import { userManager } from '../user/user.service';
import { getCaseById, type CaseItem } from './cases.data';

type OpenCaseRequestBody = {
  caseId: string;
  /** Number of cases to open (1–4). Default 1. */
  amount?: number;
};

type ProvablyFairCaseData = {
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  roll: number;
};

type OpenCaseResultItem = {
  winningItem: CaseItem;
  caseOpenId: string;
};

type OpenCaseResponse = {
  caseId: string;
  /** Single-case backward compat; present when amount is 1 or omitted. */
  winningItem?: CaseItem;
  /** Single-case backward compat; present when amount is 1 or omitted. */
  caseOpenId?: string;
  provablyFair?: ProvablyFairCaseData;
  balance: number;
  /** One entry per opened case (when amount >= 1). */
  results: OpenCaseResultItem[];
};

type CompleteCaseRequestBody = {
  caseOpenId: string;
};

type CompleteCaseResponse = {
  caseId: string;
  winningItem: CaseItem;
  balance: number;
};

export const openCase = async (
  req: Request,
  res: Response<ApiResponse<OpenCaseResponse>>
) => {
  const { caseId, amount: rawAmount } = req.body as OpenCaseRequestBody;

  if (!caseId) {
    throw new BadRequestError('caseId is required');
  }

  const amount = Math.min(4, Math.max(1, Math.floor(rawAmount ?? 1)));
  if (rawAmount !== undefined && (rawAmount < 1 || rawAmount > 4)) {
    throw new BadRequestError('amount must be between 1 and 4');
  }

  const user = req.user as User | undefined;
  if (!user) {
    throw new BadRequestError('Unauthorized');
  }

  const caseDef = getCaseById(caseId);
  if (!caseDef) {
    throw new BadRequestError('Case not found');
  }

  const userInstance = await userManager.getUser(user.id);

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { balance: true },
  });
  if (!dbUser) {
    throw new BadRequestError('User not found');
  }
  const userBalanceInCents = parseInt(dbUser.balance, 10);
  const pricePerCaseInCents = Math.round(caseDef.price * 100);
  const totalPriceInCents = pricePerCaseInCents * amount;

  if (pricePerCaseInCents <= 0) {
    throw new BadRequestError('Invalid case price');
  }

  if (userBalanceInCents < totalPriceInCents) {
    throw new BadRequestError('Insufficient balance');
  }

  const newBalanceInCents = userBalanceInCents - totalPriceInCents;

  const { balance, results, firstRoll, firstNonce } = await db.$transaction(async tx => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        balance: newBalanceInCents.toString(),
      },
    });

    const resultsList: OpenCaseResultItem[] = [];
    let firstRoll: number | null = null;
    let firstNonce: number | null = null;

    for (let i = 0; i < amount; i += 1) {
      const [float] = userInstance.generateFloats(1);
      const roll = float * 100;
      if (i === 0) {
        firstRoll = roll;
        firstNonce = userInstance.getNonce();
      }
      const winningItem = pickItemByRoll(caseDef.items, roll);
      const winValueInCents = Math.round(winningItem.value * 100);
      const nonce = userInstance.getNonce();

      const caseOpen = await tx.caseOpen.create({
        data: {
          userId: user.id,
          caseId: caseDef.id,
          winningItemName: winningItem.name,
          winningItemValue: winningItem.value,
          priceInCents: pricePerCaseInCents,
          payoutInCents: winValueInCents,
          roll,
          nonce,
          serverSeedHash: userInstance.getHashedServerSeed(),
          clientSeed: userInstance.getClientSeed(),
        },
        select: { id: true },
      });

      await userInstance.updateNonce(tx);

      resultsList.push({
        winningItem: { ...winningItem },
        caseOpenId: caseOpen.id,
      });
    }

    const updated = await tx.user.findUnique({
      where: { id: user.id },
      select: { balance: true },
    });

    return {
      balance: updated?.balance ?? newBalanceInCents.toString(),
      results: resultsList,
      firstRoll,
      firstNonce,
    };
  });

  userInstance.setBalance(balance);

  const first = results[0];
  const response: OpenCaseResponse = {
    caseId: caseDef.id,
    balance: parseInt(balance, 10) / 100,
    results,
    ...(amount === 1 &&
      first &&
      typeof firstRoll === 'number' &&
      firstNonce !== null && {
        winningItem: first.winningItem,
        caseOpenId: first.caseOpenId,
        provablyFair: {
          serverSeedHash: userInstance.getHashedServerSeed(),
          clientSeed: userInstance.getClientSeed(),
          nonce: firstNonce,
          roll: firstRoll,
        },
      }),
  };

  res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, response, 'Case opened successfully'));
};

export const completeCase = async (
  req: Request,
  res: Response<ApiResponse<CompleteCaseResponse>>
) => {
  const { caseOpenId } = req.body as CompleteCaseRequestBody;

  if (!caseOpenId) {
    throw new BadRequestError('caseOpenId is required');
  }

  const user = req.user as User | undefined;
  if (!user) {
    throw new BadRequestError('Unauthorized');
  }

  const caseOpen = await db.caseOpen.findUnique({
    where: { id: caseOpenId },
  });

  if (!caseOpen || caseOpen.userId !== user.id) {
    throw new BadRequestError('Case result not found');
  }

  if (caseOpen.status === 'completed') {
    throw new BadRequestError('Case already completed');
  }

  const caseDef = getCaseById(caseOpen.caseId);
  if (!caseDef) {
    throw new BadRequestError('Case definition not found');
  }

  // Verify stored result matches provably fair roll and current odds
  const recomputedWinningItem = pickItemByRoll(caseDef.items, caseOpen.roll);
  if (
    recomputedWinningItem.name !== caseOpen.winningItemName ||
    recomputedWinningItem.value !== caseOpen.winningItemValue
  ) {
    throw new BadRequestError('Stored case result is invalid');
  }

  const payoutInCents = caseOpen.payoutInCents;

  const { balance } = await db.$transaction(async tx => {
    const u = await tx.user.findUnique({
      where: { id: user.id },
      select: { balance: true },
    });
    if (!u) {
      throw new BadRequestError('User not found');
    }

    const currentBalanceInCents = parseInt(u.balance, 10);
    const newBalanceInCents = currentBalanceInCents + payoutInCents;

    await tx.user.update({
      where: { id: user.id },
      data: { balance: newBalanceInCents.toString() },
    });

    await tx.caseOpen.update({
      where: { id: caseOpen.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });

    const updated = await tx.user.findUnique({
      where: { id: user.id },
      select: { balance: true },
    });

    return {
      balance: updated?.balance ?? newBalanceInCents.toString(),
    };
  });

  const response: CompleteCaseResponse = {
    caseId: caseOpen.caseId,
    winningItem: {
      name: caseOpen.winningItemName,
      chance: recomputedWinningItem.chance,
      value: caseOpen.winningItemValue,
    },
    balance: parseInt(balance, 10) / 100,
  };

  // Keep in-memory UserInstance balance in sync so subsequent
  // game/case operations use the correct, updated balance.
  try {
    const userInstance = await userManager.getUser(user.id);
    userInstance.setBalance(balance);
  } catch {
    // If user instance is not available, ignore; it'll be reloaded
    // from the database on the next request.
  }

  res
    .status(StatusCodes.OK)
    .json(
      new ApiResponse(
        StatusCodes.OK,
        response,
        'Case completion processed successfully'
      )
    );
};

const pickItemByRoll = (items: CaseItem[], roll: number): CaseItem => {
  let cumulative = 0;
  for (const item of items) {
    cumulative += item.chance;
    if (roll < cumulative) {
      return item;
    }
  }
  // Fallback: return last item if rounding/float edge case
  return items[items.length - 1];
};

