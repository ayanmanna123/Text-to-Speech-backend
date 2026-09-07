import { ApiError } from '../utils/apiError.js';
import { sendError } from '../utils/apiResponse.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  let { statusCode, message, isOperational, stack } = err;

  if (!(err instanceof ApiError)) {
    statusCode = err.statusCode || 500;
    message = err.message || 'Internal Server Error';
    isOperational = false;
  }

  logger.error(`[${req.method}] ${req.originalUrl} - ${statusCode}: ${message}`);
  if (stack && env.NODE_ENV === 'development') {
    logger.debug(stack);
  }

  const response = {
    statusCode,
    message,
    ...(env.NODE_ENV === 'development' && { stack }),
  };

  return sendError(res, response);
};
