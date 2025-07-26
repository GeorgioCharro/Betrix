import supertest from 'supertest';
import db from '@repo/db';
import { createServer } from '../../../server';

jest.mock('@repo/db', () => ({
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
}));

describe('register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a user', async () => {
    (db.user.findUnique as jest.Mock).mockResolvedValue(null);
    (db.user.findFirst as jest.Mock).mockResolvedValue(null);
    (db.user.create as jest.Mock).mockResolvedValue({
      id: '1',
      email: 'test@example.com',
      username: 'tester',
      dateOfBirth: new Date('1990-01-01'),
      code: 'abc',
    });

    await supertest(await createServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'test@example.com',
        username: 'tester',
        password: 'pass',
        dateOfBirth: '1990-01-01',
        code: 'abc',
      })
      .expect(201);
  });
});
