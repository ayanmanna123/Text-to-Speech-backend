import { Router } from 'express';
import { getVoices, getVoicePreview } from '../controllers/voiceController.js';
import { validate } from '../middlewares/validate.js';
import { getVoicesSchema, getVoicePreviewSchema } from '../validators/voiceValidator.js';

const router = Router();

router.get('/', validate(getVoicesSchema), getVoices);
router.post('/preview', validate(getVoicePreviewSchema), getVoicePreview);

export default router;

