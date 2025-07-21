import db from '@repo/db';
import { UserInstance } from '../user.service';
import { BadRequestError } from '../../../errors';

jest.mock('@repo/db', () => ({
  bet: { findFirst: jest.fn() },
  provablyFairState: { update: jest.fn(), create: jest.fn() },
  $transaction: jest.fn(),
}));

const mockUser = {
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

const mockState = {
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

  const txMock = db.$transaction as jest.Mock;
  txMock.mockImplementation((cb: (t: typeof tx) => unknown) => cb(tx));
  return tx;
};

describe('rotateSeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when an active bet exists', async () => {
    const findFirstMock = db.bet.findFirst as jest.Mock;
    findFirstMock.mockResolvedValue({ id: 'bet1' });

    const instance = new UserInstance(mockUser, mockState);
    await expect(instance.rotateSeed('seed')).rejects.toThrow(BadRequestError);

    expect(findFirstMock).toHaveBeenCalledWith({
      where: { userId: mockUser.id, active: true },
    });
  });

  it('rotates seeds when no active bet', async () => {
    const findFirstMock = db.bet.findFirst as jest.Mock;
    findFirstMock.mockResolvedValue(null);

    const tx = setupTransaction();
    const instance = new UserInstance(mockUser, mockState);

    const result = await instance.rotateSeed('seed');
    expect(result).toMatchObject({ clientSeed: 'seed' });

    expect(findFirstMock).toHaveBeenCalledWith({
      where: { userId: mockUser.id, active: true },
    });

    expect(tx.provablyFairState.update).toHaveBeenCalled();
    expect(tx.provablyFairState.create).toHaveBeenCalled();
  });
});
