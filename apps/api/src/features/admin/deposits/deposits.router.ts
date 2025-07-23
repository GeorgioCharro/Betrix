import { Router } from 'express';
import {
  getAllDeposits,
  getDepositsByUser,
  getDepositsByTime,
} from './deposits.controller';

const router: Router = Router();

router.get('/', getAllDeposits);
router.get('/user/:userId', getDepositsByUser);
router.get('/time', getDepositsByTime);

export default router;
