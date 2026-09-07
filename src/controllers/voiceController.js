import { VoiceService } from '../services/voiceService.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const getVoices = async (req, res, next) => {
  try {
    const { provider, gender, category, search } = req.query;

    const voices = await VoiceService.getAllVoices({
      provider,
      gender,
      category,
      search,
    });

    return sendSuccess(res, {
      message: 'Voices retrieved successfully',
      data: voices,
      meta: { count: voices.length },
    });
  } catch (err) {
    next(err);
  }
};
