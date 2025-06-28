import db from '@repo/db';
import type { Request, Response } from 'express';
import type { RoulettePlaceBetResponse, RouletteFormattedBet} from '@repo/common/game-utils/roulette/index.js';
import type { Prisma, User } from '@prisma/client';
import { BetsSchema, validateBets, RouletteBetTypes } from '@repo/common/game-utils/roulette/index.js';
import { StatusCodes } from 'http-status-codes';
import { ApiResponse } from '@repo/common/types';
import { sum } from 'lodash';
import { BadRequestError } from '../../../errors';
import { userManager } from '../../user/user.service';
import { calculatePayout, spinWheel } from './roulette.service';

export const placeBetAndSpin = async (
  request: Request,
  response: Response<ApiResponse<RoulettePlaceBetResponse>>
): Promise<void> => {
  const validationResult = BetsSchema.safeParse(request.body);

  if (!validationResult.success) {
    throw new BadRequestError('Invalid request for bets');
  }

  const { bets } = validationResult.data;
  const validBets = validateBets(bets);

  if (validBets.length === 0) {
    throw new BadRequestError('No valid bets placed');
  }

  const userInstance = await userManager.getUser((request.user as User).id);
  const user = userInstance.getUser();

  const totalBetAmountInCents = Math.round(
    sum(validBets.map(bet => bet.amount)) * 100
  );

  const userBalanceInCents = userInstance.getBalanceAsNumber();

  if (userBalanceInCents < totalBetAmountInCents) {
    throw new BadRequestError('Insufficient balance');
  }

  const winningNumber = await spinWheel(user.id);
  const payout = calculatePayout(validBets, winningNumber);


const formattedBets: RouletteFormattedBet[] = validBets.map(bet => {
  switch (bet.betType) {
    case RouletteBetTypes.STRAIGHT:
    case RouletteBetTypes.DOZEN:
    case RouletteBetTypes.COLUMN:
      // Always wrap as array for GraphQL consistency
      return {
        ...bet,
        selection: Array.isArray(bet.selection) ? bet.selection : [bet.selection],
      } as RouletteFormattedBet;

    case RouletteBetTypes.SPLIT:
    case RouletteBetTypes.CORNER:
    case RouletteBetTypes.STREET:
    case RouletteBetTypes.SIXLINE:
      // These already have array selection
      return { ...bet } as RouletteFormattedBet;

    // These bet types have NO selection
    case RouletteBetTypes.BLACK:
    case RouletteBetTypes.RED:
    case RouletteBetTypes.EVEN:
    case RouletteBetTypes.ODD:
    case RouletteBetTypes.HIGH:
    case RouletteBetTypes.LOW:
      return bet as RouletteFormattedBet;

    default:
      return bet as RouletteFormattedBet;
  }
});


  const gameState: Prisma.JsonObject = {
    bets: formattedBets as unknown as Prisma.JsonArray,
    winningNumber: String(winningNumber),
  };

  const payoutInCents = Math.round(payout * 100);
  const balanceChangeInCents = payoutInCents - totalBetAmountInCents;
  const newBalance = (userBalanceInCents + balanceChangeInCents).toString();

  const { balance, id } = await db.$transaction(async tx => {
    const bet = await tx.bet.create({
      data: {
        active: false,
        betAmount: totalBetAmountInCents,
        betNonce: userInstance.getNonce(),
        game: 'roulette',
        payoutAmount: payoutInCents,
        provablyFairStateId: userInstance.getProvablyFairStateId(),
        state: gameState as Prisma.InputJsonValue,
        userId: user.id,
      },
    });

    await userInstance.updateNonce(tx);

    const userWithNewBalance = await tx.user.update({
      where: { id: user.id },
      data: {
        balance: newBalance,
      },
    });

    return {
      balance: userWithNewBalance.balance,
      id: bet.id,
    };
  });

  userInstance.setBalance(balance);

  response.status(StatusCodes.OK).json(
    new ApiResponse(StatusCodes.OK, {
      id,
      state: gameState as unknown as RoulettePlaceBetResponse['state'],
      payoutMultiplier: payoutInCents / totalBetAmountInCents,
      payout: payoutInCents / 100,
      balance: userInstance.getBalanceAsNumber() / 100,
    })
  );
};
