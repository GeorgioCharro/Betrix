import { Router } from 'express';
import { requireApiKey } from '../../middlewares/api-key';
import betsRouter from './bets/bets.router';
import depositsRouter from './deposits/deposits.router';
import withdrawsRouter from './withdraws/withdraws.router';
import usersRouter from './users/users.router';
import { depositBalance } from './deposits/deposits.controller';
import { withdrawBalance } from './withdraws/withdraws.controller';

const router: Router = Router();

router.post('/deposit', requireApiKey, depositBalance);
router.post('/withdraw', requireApiKey, withdrawBalance);
router.use('/bets', requireApiKey, betsRouter);
router.use('/deposits', requireApiKey, depositsRouter);
router.use('/withdraws', requireApiKey, withdrawsRouter);
router.use('/users', requireApiKey, usersRouter);

export default router;
