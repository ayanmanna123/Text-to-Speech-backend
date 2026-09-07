import { Router } from 'express';
import { getVoices } from '../controllers/voiceController.js';
import { validate } from '../middlewares/validate.js';
import { getVoicesSchema } from '../validators/voiceValidator.js';

const router = Router();

router.get('/', validate(getVoicesSchema), getVoices);

export default router;
