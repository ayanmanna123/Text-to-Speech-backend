import { TTSService } from '../services/ttsService.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const generateSpeech = async (req, res, next) => {
  try {
    const userId = req.user?.id || null;
    const { text, voiceId, voiceName, provider, format, settings } = req.body;

    const result = await TTSService.generateSpeech({
      userId,
      text,
      voiceId,
      voiceName,
      provider,
      format,
      settings,
    });

    return sendSuccess(res, {
      message: 'Speech synthesized successfully',
      data: {
        generationId: result.generationId,
        audioUrl: result.audioUrl,
        durationSeconds: result.durationSeconds,
        characterCount: result.characterCount,
        provider: result.provider,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const streamSpeech = async (req, res, next) => {
  try {
    const userId = req.user?.id || null;
    const { text, voiceId, voiceName, provider, format, settings } = req.body;

    const result = await TTSService.generateSpeech({
      userId,
      text,
      voiceId,
      voiceName,
      provider,
      format,
      settings,
    });

    res.set({
      'Content-Type': result.contentType,
      'Content-Length': result.audioBuffer.length,
      'Cache-Control': 'no-cache',
    });

    return res.status(200).send(result.audioBuffer);
  } catch (err) {
    next(err);
  }
};

export const getUserHistory = async (req, res, next) => {
  try {
    const userId = req.user?.id || null;
    const limit = Number(req.query.limit) || 20;
    const page = Number(req.query.page) || 1;

    const historyData = await TTSService.getUserHistory(userId, limit, page);

    return sendSuccess(res, {
      message: 'Generation history retrieved successfully',
      data: historyData.history,
      meta: {
        total: historyData.total,
        page: historyData.page,
        limit: historyData.limit,
      },
    });
  } catch (err) {
    next(err);
  }
};
