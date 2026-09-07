import { Router } from 'express';
import ttsRoutes from './ttsRoutes.js';
import voiceRoutes from './voiceRoutes.js';
import usageRoutes from './usageRoutes.js';
import projectRoutes from './projectRoutes.js';
import healthRoutes from './healthRoutes.js';

const router = Router();

// Health Check
router.use('/', healthRoutes);

// API v1 Routes
router.use('/api/v1/tts', ttsRoutes);
router.use('/api/v1/voices', voiceRoutes);
router.use('/api/v1/usage', usageRoutes);
router.use('/api/v1/projects', projectRoutes);

export default router;
