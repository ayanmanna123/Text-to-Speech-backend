import { ProjectService } from '../services/projectService.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const createProject = async (req, res, next) => {
  try {
    const userId = req.user?.id || null;
    const { title, description, scriptBlocks } = req.body;

    const project = await ProjectService.createProject(userId, {
      title,
      description,
      scriptBlocks,
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: 'Project created successfully',
      data: project,
    });
  } catch (err) {
    next(err);
  }
};

export const getUserProjects = async (req, res, next) => {
  try {
    const userId = req.user?.id || null;
    const projects = await ProjectService.getUserProjects(userId);

    return sendSuccess(res, {
      message: 'Projects retrieved successfully',
      data: projects,
    });
  } catch (err) {
    next(err);
  }
};
