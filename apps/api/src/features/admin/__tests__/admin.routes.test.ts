import supertest from 'supertest';
import db from '@repo/db';
import { createServer } from '../../../server';

jest.mock('@repo/db', () => ({
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  bet: {
    findMany: jest.fn(),
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

    const app = await createServer();
    await supertest(app)
      .post('/api/v1/admin/deposit')
      .set('x-api-key', 'testkey')
      .send({ userId: '1', amount: 1 })
      .expect(200);

    expect(db.user.update).toHaveBeenCalled();
  });
});
