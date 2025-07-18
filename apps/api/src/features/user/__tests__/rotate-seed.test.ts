// eslint-env jest


import db from '@repo/db';
import { UserInstance } from '../user.service';
import { BadRequestError } from '../../../errors';

jest.mock('@repo/db', () => ({
  bet: { findFirst: jest.fn() },
  provablyFairState: { update: jest.fn(), create: jest.fn() },
  $transaction: jest.fn(),
}));

interface MockUser {
  id: string;
  googleId: string | null;
  email: string;
  name: string | null;
  password: string | null;
  picture: string | null;
  balance: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MockProvablyFairState {
  id: string;
  userId: string;
  serverSeed: string;
  clientSeed: string;
  hashedServerSeed: string;
  nonce: number;
  revealed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const mockUser: MockUser = {
  id: 'user1',
  googleId: null,
  email: 'test@example.com',
  name: null,
  password: null,
  picture: null,
  balance: '0',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockState: MockProvablyFairState = {
  id: 'state1',
  userId: 'user1',
  serverSeed: 'server',
  clientSeed: 'client',
  hashedServerSeed: 'hashed-server',
  nonce: 0,
  revealed: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const setupTransaction = (): typeof db => {
  const tx = {
    provablyFairState: {
      update: jest.fn().mockResolvedValue(undefined),
      create: jest.fn().mockResolvedValue({
        ...mockState,
        serverSeed: 'newServer',
        clientSeed: 'clientSeed',
        nonce: 0,
      }),
    },
    bet: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  } as unknown as typeof db;

  (db.$transaction as jest.Mock).mockImplementation((cb: (t: typeof tx) => unknown) => cb(tx));
  return tx;
};

describe('rotateSeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when an active bet exists', async () => {
  (db.bet.findFirst as jest.Mock).mockResolvedValue({ id: 'bet1' });
  const instance = new UserInstance(mockUser, mockState);

  await expect(instance.rotateSeed('seed')).rejects.toThrow(BadRequestError);

  expect(db.bet.findFirst).toHaveBeenCalledWith({
    where: { userId: mockUser.id, active: true },
  });
});

it('rotates seeds when no active bet', async () => {
  (db.bet.findFirst as jest.Mock).mockResolvedValue(null);
  const tx = setupTransaction();
  const instance = new UserInstance(mockUser, mockState);

  const result = await instance.rotateSeed('seed');
  expect(result).toMatchObject({ clientSeed: 'seed' });

  expect(db.bet.findFirst).toHaveBeenCalledWith({
    where: { userId: mockUser.id, active: true },
  });
  expect(tx.provablyFairState.update).toHaveBeenCalled();
  expect(tx.provablyFairState.create).toHaveBeenCalled();
});

});

