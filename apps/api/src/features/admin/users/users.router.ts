import { Router } from 'express';
import { getAllUsers, getUsersByTime } from './users.controller';

const router: Router = Router();

router.get('/', getAllUsers);
router.get('/time', getUsersByTime);

export default router;
