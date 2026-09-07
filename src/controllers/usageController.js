import { UsageService } from '../services/usageService.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const getUserBalance = async (req, res, next) => {
  try {
    const userId = req.user?.id || null;
    const usage = await UsageService.getUserUsage(userId);

    return sendSuccess(res, {
      message: 'Usage balance retrieved successfully',
      data: usage,
    });
  } catch (err) {
    next(err);
  }
};
