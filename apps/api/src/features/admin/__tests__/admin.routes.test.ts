import supertest from 'supertest';
import db from '@repo/db';
import { createServer } from '../../../server';

jest.mock('@repo/db', () => ({
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  deposit: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  withdraw: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  bet: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
}));

describe('Admin routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ADMIN_API_KEY = 'testkey';
  });

  it('rejects requests without api key', async () => {
    const app = await createServer();
    await supertest(app).get('/api/v1/admin/users').expect(401);
  });

  it('allows deposit with valid api key', async () => {
    (db.user.findUnique as jest.Mock).mockResolvedValue({
      id: '1',
      balance: '100',
    });
    (db.user.update as jest.Mock).mockResolvedValue({
      id: '1',
      balance: '200',
    });
    (db.deposit.create as jest.Mock).mockResolvedValue({});

    const app = await createServer();
    await supertest(app)
      .post('/api/v1/admin/deposit')
      .set('x-api-key', 'testkey')
      .send({ userId: '1', amount: 1 })
      .expect(200);

    expect(db.user.update).toHaveBeenCalled();
    expect(db.deposit.create).toHaveBeenCalled();
  });

  it('allows withdraw with valid api key', async () => {
    (db.user.findUnique as jest.Mock).mockResolvedValue({
      id: '1',
      balance: '200',
    });
    (db.user.update as jest.Mock).mockResolvedValue({
      id: '1',
      balance: '100',
    });
    (db.withdraw.create as jest.Mock).mockResolvedValue({});

    const app = await createServer();
    await supertest(app)
      .post('/api/v1/admin/withdraw')
      .set('x-api-key', 'testkey')
      .send({ userId: '1', amount: 1 })
      .expect(200);

    expect(db.user.update).toHaveBeenCalled();
    expect(db.withdraw.create).toHaveBeenCalled();
  });

  it('returns paginated bets', async () => {
    (db.bet.findMany as jest.Mock).mockResolvedValue([]);
    (db.bet.count as jest.Mock).mockResolvedValue(10);

    const app = await createServer();
    await supertest(app)
      .get('/api/v1/admin/bets?page=2&pageSize=5')
      .set('x-api-key', 'testkey')
      .expect(200);

    expect(db.bet.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true } } },
      skip: 5,
      take: 5,
    });
    expect(db.bet.count).toHaveBeenCalled();
  });

  it('returns paginated deposits', async () => {
    (db.deposit.findMany as jest.Mock).mockResolvedValue([]);
    (db.deposit.count as jest.Mock).mockResolvedValue(6);

    const app = await createServer();
    await supertest(app)
      .get('/api/v1/admin/deposits?page=2&pageSize=5')
      .set('x-api-key', 'testkey')
      .expect(200);

    expect(db.deposit.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true } } },
      skip: 5,
      take: 5,
    });
    expect(db.deposit.count).toHaveBeenCalled();
  });

  it('returns paginated withdraws', async () => {
    (db.withdraw.findMany as jest.Mock).mockResolvedValue([]);
    (db.withdraw.count as jest.Mock).mockResolvedValue(8);

    const app = await createServer();
    await supertest(app)
      .get('/api/v1/admin/withdraws?page=2&pageSize=5')
      .set('x-api-key', 'testkey')
      .expect(200);

    expect(db.withdraw.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true } } },
      skip: 5,
      take: 5,
    });
    expect(db.withdraw.count).toHaveBeenCalled();
  });

  it('returns paginated users', async () => {
    (db.user.findMany as jest.Mock).mockResolvedValue([]);
    (db.user.count as jest.Mock).mockResolvedValue(20);

    const app = await createServer();
    await supertest(app)
      .get('/api/v1/admin/users?page=3&pageSize=10')
      .set('x-api-key', 'testkey')
      .expect(200);

    expect(db.user.findMany).toHaveBeenCalledWith({
      select: {
        id: true,
        email: true,
        name: true,
        balance: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: 20,
      take: 10,
    });
    expect(db.user.count).toHaveBeenCalled();
  });
});
