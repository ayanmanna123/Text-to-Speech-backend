import { ApiError } from '../utils/apiError.js';

export const validate = (schema) => (req, res, next) => {
  try {
    const validData = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    
    if (validData.body) req.body = validData.body;
    if (validData.query) Object.assign(req.query, validData.query);
    if (validData.params) Object.assign(req.params, validData.params);
    
    next();
  } catch (error) {
    const issues = error.errors ? error.errors.map((e) => `${e.path.join('.')}: ${e.message}`) : [error.message];
    next(ApiError.badRequest(`Validation Failed: ${issues.join('; ')}`));
  }
};
