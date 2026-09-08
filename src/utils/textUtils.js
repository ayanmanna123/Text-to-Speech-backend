import { ApiError } from './apiError.js';

export const MAX_TEXT_LENGTH = 5000;

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
 * Validate input text against rules:
 * 1. Must not be empty
 * 2. Must not exceed maximum length (5000 characters)
 * 3. Unsupported/unprintable characters sanitized & validated for speakable content
 */
export function validateSpeakableText(text = '') {
  // 1. Text must not be empty
  if (!text || typeof text !== 'string' || !text.trim()) {
    throw new ApiError(400, 'Text must not be empty. Please provide valid text to convert.');
  }

  // 2. Text should have a maximum length limit
  if (text.length > MAX_TEXT_LENGTH) {
    throw new ApiError(400, `Text exceeds maximum allowed length of ${MAX_TEXT_LENGTH} characters per request.`);
  }

  // 3. Handle unsupported characters appropriately
  const sanitized = sanitizeText(text);

  if (!sanitized) {
    throw new ApiError(400, 'Text contains no valid speakable characters after removing unprintable symbols.');
  }

  // Check if string contains at least one letter, digit, or valid language script character across Unicode
  const hasSpeakableContent = /[\p{L}\p{N}]/u.test(sanitized);

  if (!hasSpeakableContent) {
    throw new ApiError(400, 'Text contains only unsupported symbols or emojis without speakable words. Please enter valid text.');
  }

  return sanitized;
}

