import axios from 'axios';
import { logger } from '@services/logger.service';

/**
 *
 */
class TranslationService {
  private readonly endpoint = 'https://api.cognitive.microsofttranslator.com';

  private readonly apiKey = process.env.AZURE_TRANSLATOR_KEY;

  private readonly region = process.env.AZURE_TRANSLATOR_REGION;

  /**
   * Translate text using Azure Cognitive Translator v3.
   *
   * @param text Source text to translate
   * @param from BCP-47 source language code (e.g. 'en'). Pass null for auto-detect.
   * @param to BCP-47 target language code (e.g. 'uk')
   * @param format Explicit text format ('html' or 'plain')
   */
  async translate(
    text: string,
    from: string | null,
    to: string,
    format?: 'html' | 'plain'
  ): Promise<string> {
    if (!text || !text.trim()) {
      return '';
    }

    if (!this.apiKey) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Azure Translator key is not configured');
      }
      logger.warn(
        'Azure Translator API key not configured, returning stub translation'
      );
      return `[Translated to ${to}]: ${text}`;
    }

    // Auto-detect HTML content to preserve markup structure if format is not explicitly provided
    const isHtml = format ? format === 'html' : /<[a-z][\s\S]*>/i.test(text);

    try {
      const response = await axios.post(
        `${this.endpoint}/translate`,
        [{ text }],
        {
          params: {
            'api-version': '3.0',
            ...(from && { from }),
            to,
            textType: isHtml ? 'html' : 'plain',
          },
          headers: {
            'Ocp-Apim-Subscription-Key': this.apiKey,
            'Ocp-Apim-Subscription-Region': this.region,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data[0].translations[0].text;
    } catch (err) {
      logger.error('Error calling Azure Cognitive Translator', {
        error: err.message,
        stack: err.stack,
      });
      throw err;
    }
  }
}

export default new TranslationService();
