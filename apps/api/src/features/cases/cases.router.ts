import { Router } from 'express';
import { isAuthenticated } from '../../middlewares/auth.middleware';
import { completeCase, openCase } from './cases.controller';

const router = Router();

router.post('/cases/open', isAuthenticated, openCase);
router.post('/cases/complete', isAuthenticated, completeCase);

export default router;

