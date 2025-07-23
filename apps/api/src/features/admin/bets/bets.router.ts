import { Router } from 'express';
import { getAllBets, getBetsByUser, getBetsByTime } from './bets.controller';

const router: Router = Router();

router.get('/', getAllBets);
router.get('/user/:userId', getBetsByUser);
router.get('/time', getBetsByTime);

export default router;
