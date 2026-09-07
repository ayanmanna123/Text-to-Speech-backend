import { Router } from 'express';
import { createProject, getUserProjects } from '../controllers/projectController.js';
import { optionalAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createProjectSchema } from '../validators/projectValidator.js';

const router = Router();

router.post('/', optionalAuth, validate(createProjectSchema), createProject);
router.get('/', optionalAuth, getUserProjects);

export default router;
