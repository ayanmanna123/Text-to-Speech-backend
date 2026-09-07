import { Router } from 'express';
import { getUserBalance } from '../controllers/usageController.js';
import { optionalAuth } from '../middlewares/auth.js';

const router = Router();

router.get('/balance', optionalAuth, getUserBalance);

export default router;
