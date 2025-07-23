import { Router } from 'express';
import {
  getAllWithdraws,
  getWithdrawsByUser,
  getWithdrawsByTime,
} from './withdraws.controller';

const router: Router = Router();

router.get('/', getAllWithdraws);
router.get('/user/:userId', getWithdrawsByUser);
router.get('/time', getWithdrawsByTime);

export default router;
