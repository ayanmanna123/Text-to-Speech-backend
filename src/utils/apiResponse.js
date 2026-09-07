import { HTTP_STATUS } from '../config/constants.js';

export const sendSuccess = (res, { statusCode = HTTP_STATUS.OK, message = 'Success', data = null, meta = null }) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    meta,
    timestamp: new Date().toISOString(),
  });
};

export const sendError = (res, { statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, message = 'Error', errors = null }) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
    timestamp: new Date().toISOString(),
  });
};
