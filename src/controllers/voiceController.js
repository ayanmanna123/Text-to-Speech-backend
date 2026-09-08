import { VoiceService } from '../services/voiceService.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const getVoices = async (req, res, next) => {
  try {
    const { provider, gender, category, search, language } = req.query;

    const voices = await VoiceService.getAllVoices({
      provider,
      gender,
      category,
      search,
      language,
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

export const getVoicePreview = async (req, res, next) => {
  try {
    const { voiceId, voiceName, provider, sampleText } = req.body;

    const result = await VoiceService.getOrGenerateVoicePreview({
      voiceId,
      voiceName,
      provider,
      sampleText,
    });

    return sendSuccess(res, {
      message: result.cached ? 'Voice preview retrieved from cache' : 'Voice preview generated and saved',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

