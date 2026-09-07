import { Router } from 'express';
import { generateSpeech, streamSpeech, getUserHistory } from '../controllers/ttsController.js';
import { validate } from '../middlewares/validate.js';
import { generateTtsSchema } from '../validators/ttsValidator.js';
import { optionalAuth, authenticateUser } from '../middlewares/auth.js';
import { ttsLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

router.post('/generate', ttsLimiter, optionalAuth, validate(generateTtsSchema), generateSpeech);
router.post('/stream', ttsLimiter, optionalAuth, validate(generateTtsSchema), streamSpeech);
router.get('/history', optionalAuth, getUserHistory);

export default router;
