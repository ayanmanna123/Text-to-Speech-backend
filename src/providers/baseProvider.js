/**
 * Abstract Base Class for TTS Drivers
 */
export class BaseTTSProvider {
  constructor(name) {
    if (this.constructor === BaseTTSProvider) {
      throw new Error('BaseTTSProvider cannot be instantiated directly.');
    }
    this.name = name;
  }

  /**
   * Synthesize text to audio buffer
   * @param {Object} params - { text, voiceId, format, settings }
   * @returns {Promise<{ audioBuffer: Buffer, contentType: string, provider: string }>}
   */
  async generateSpeech({ text, voiceId, format = 'mp3', settings = {} }) {
    throw new Error(`generateSpeech() must be implemented by ${this.name} provider.`);
  }

  /**
   * Fetch available voices from provider
   * @returns {Promise<Array>}
   */
  async getVoices() {
    throw new Error(`getVoices() must be implemented by ${this.name} provider.`);
  }
}
