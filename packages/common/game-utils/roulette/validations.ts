import { z } from 'zod';
import {
  validCornerBets,
  validSixLineBets,
  validSplitBets,
  validStreetBets,
} from './constants';

export enum RouletteBetTypes {
  STRAIGHT = 'straight',
  SPLIT = 'split',
  SIXLINE = 'sixline',
  CORNER = 'corner',
  STREET = 'street',
  ODD = 'odd',
  EVEN = 'even',
  HIGH = 'high',
  LOW = 'low',
  BLACK = 'black',
  RED = 'red',
  COLUMN = 'column',
  DOZEN = 'dozen',
}

const amountSchema = z.number().min(0.01, 'Bet amount must be at least 0.01');
const singleNumber = (min: number, max: number) =>
  z.preprocess(
    val => (Array.isArray(val) ? val[0] : val),
    z.number().int().min(min).max(max)
  );

const straightBetSchema = z.object({
  betType: z.literal(RouletteBetTypes.STRAIGHT),
  selection: singleNumber(0, 36),
  amount: amountSchema,
});

const splitBetSchema = z.object({
  betType: z.literal(RouletteBetTypes.SPLIT),
  selection: z
    .array(z.number().int().min(0).max(36))
    .length(2)
    .superRefine((val, ctx) => {
      const sortedKey = val.sort((a, b) => a - b).join(',');
      if (!validSplitBets.has(sortedKey)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Invalid split bet selection. The two numbers must be adjacent.',
        });
      }
    }),
  amount: amountSchema,
});

const cornerBetSchema = z.object({
  betType: z.literal(RouletteBetTypes.CORNER),
  selection: z
    .array(z.number().int().min(0).max(36))
    .length(4)
    .superRefine((val, ctx) => {
      const sortedKey = val.sort((a, b) => a - b).join(',');
      if (!validCornerBets.has(sortedKey)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Invalid corner bet selection. The four numbers must form a square.',
        });
      }
    }),
  amount: amountSchema,
});

const streetBetSchema = z.object({
  betType: z.literal(RouletteBetTypes.STREET),
  selection: z
    .array(z.number().int().min(1).max(36))
    .length(3)
    .superRefine((val, ctx) => {
      const sortedKey = val.sort((a, b) => a - b).join(',');
      if (!validStreetBets.has(sortedKey)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Invalid street bet selection. The three numbers must form a straight line.',
        });
      }
    }),
  amount: amountSchema,
});

const sixLineBetSchema = z.object({
  betType: z.literal(RouletteBetTypes.SIXLINE),
  selection: z
    .array(z.number().int().min(1).max(36))
    .length(6)
    .superRefine((val, ctx) => {
      const sortedKey = val.sort((a, b) => a - b).join(',');
      if (!validSixLineBets.has(sortedKey)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid six-line bet selection.',
        });
      }
    }),
  amount: amountSchema,
});

const dozenBetSchema = z.object({
  betType: z.literal(RouletteBetTypes.DOZEN),
  selection: singleNumber(1, 3),
  amount: amountSchema,
});

const columnBetSchema = z.object({
  betType: z.literal(RouletteBetTypes.COLUMN),
  selection: singleNumber(1, 3),
  amount: amountSchema,
});

const equalPayoutBets = z.object({
  betType: z.enum([
    RouletteBetTypes.BLACK,
    RouletteBetTypes.RED,
    RouletteBetTypes.EVEN,
    RouletteBetTypes.ODD,
    RouletteBetTypes.HIGH,
    RouletteBetTypes.LOW,
  ]),
  amount: amountSchema,
});

// Define the union schema
const RouletteBetSchema = z.union([
  straightBetSchema,
  splitBetSchema,
  cornerBetSchema,
  streetBetSchema,
  sixLineBetSchema,
  dozenBetSchema,
  columnBetSchema,
  equalPayoutBets,
]);

// Export the type
export type RouletteBet = z.infer<typeof RouletteBetSchema>;

// Then use the schema in your object schema
const BetsSchema = z.object({
  bets: z.array(RouletteBetSchema), // Using the schema value, not the type
});

const validateBets = (bets: RouletteBet[]) => {
  const validBets: RouletteBet[] = [];
  for (const bet of bets) {
    const result = RouletteBetSchema.safeParse(bet);
    if (result.success) {
      validBets.push(result.data);
    }
  }
  return validBets;
};

export { BetsSchema, validateBets };
