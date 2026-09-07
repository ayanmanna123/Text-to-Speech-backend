/**
  Audio utilities for TTS processing
 */

export const calculateEstimatedDuration = (text, wordsPerMinute = 150) => {
  if (!text) return 0;
  const wordCount = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round((wordCount / wordsPerMinute) * 60));
};

export const getAudioMimeType = (format = 'mp3') => {
  switch (format.toLowerCase()) {
    case 'wav':
      return 'audio/wav';
    case 'ogg':
      return 'audio/ogg';
    case 'mp3':
    default:
      return 'audio/mpeg';
  }
};

export const bufferToBase64 = (buffer) => {
  return buffer.toString('base64');
};
