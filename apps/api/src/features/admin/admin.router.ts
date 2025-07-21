import { Router } from 'express';
import { requireApiKey } from '../../middlewares/api-key';
import {
  depositBalance,
  withdrawBalance,
  getAllBets,
  getAllUsers,
} from './admin.controller';

const router: Router = Router();

router.post('/deposit', requireApiKey, depositBalance);
router.post('/withdraw', requireApiKey, withdrawBalance);
router.get('/bets', requireApiKey, getAllBets);
router.get('/users', requireApiKey, getAllUsers);

export default router;
