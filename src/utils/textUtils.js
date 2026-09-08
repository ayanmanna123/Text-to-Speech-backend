import { ApiError } from './apiError.js';

/**
 * Sanitize input text by removing unprintable control characters, zero-width spaces, and invalid Unicode sequences.
 */
export function sanitizeText(text = '') {
  if (typeof text !== 'string') return '';

  return text
    // Remove null bytes and unprintable control characters (except newline, carriage return, tab)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    // Remove zero-width spaces and invisible formatting marks
    .replace(/[\u200B-\u200D\uFEFF\u202A-\u202E]/g, '')
    // Normalize unicode composite characters to standard canonical form (NFC)
    .normalize('NFC')
    .trim();
}

/**
 * Validate that sanitized text contains speakable characters (alphanumeric, letters across languages, or standard punctuation).
 */
export function validateSpeakableText(text = '') {
  const sanitized = sanitizeText(text);

  if (!sanitized) {
    throw new ApiError(400, 'Text contains no valid printable characters for speech synthesis.');
  }

  // Check if string contains at least one letter, digit, or valid language script character
  const hasSpeakableContent = /[\p{L}\p{N}]/u.test(sanitized);

  if (!hasSpeakableContent) {
    throw new ApiError(400, 'Text contains only unsupported symbols or unprintable characters. Please enter speakable words or text.');
  }

  return sanitized;
}
