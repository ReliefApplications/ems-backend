import axios from 'axios';
import config from 'config';
import { TranslationService } from '@services/translation.service';

jest.mock('axios');
/**
 *
 */
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TranslationService', () => {
  const originalEnv = process.env;
  let service: TranslationService;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    service = new TranslationService();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  it('should return empty string if text is empty or whitespace', async () => {
    const res1 = await service.translate('', null, 'uk');
    const res2 = await service.translate('   ', null, 'uk');
    expect(res1).toBe('');
    expect(res2).toBe('');
  });

  describe('when API key is not configured', () => {
    beforeEach(() => {
      // Ensure apiKey is undefined on the service instance
      (service as any).apiKey = undefined;
    });

    it('should throw an error in production environment', async () => {
      jest.spyOn(config.util, 'getEnv').mockReturnValue('production');
      await expect(service.translate('Hello', null, 'uk')).rejects.toThrow(
        'Azure Translator key is not configured'
      );
    });

    it('should return stub translation in non-production environments', async () => {
      jest.spyOn(config.util, 'getEnv').mockReturnValue('development');
      const res = await service.translate('Hello', null, 'uk');
      expect(res).toBe('[Translated to uk]: Hello');
    });
  });

  describe('when API key is configured', () => {
    beforeEach(() => {
      (service as any).apiKey = 'test-api-key';
      (service as any).region = 'test-region';
    });

    it('should call Azure Translator API and return translation', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: [{ translations: [{ text: 'Привіт' }] }],
      } as any);

      const res = await service.translate('Hello', 'en', 'uk', 'plain');

      expect(res).toBe('Привіт');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.cognitive.microsofttranslator.com/translate',
        [{ text: 'Hello' }],
        {
          params: {
            'api-version': '3.0',
            from: 'en',
            to: 'uk',
            textType: 'plain',
          },
          headers: {
            'Ocp-Apim-Subscription-Key': 'test-api-key',
            'Ocp-Apim-Subscription-Region': 'test-region',
            'Content-Type': 'application/json',
          },
        }
      );
    });

    it('should auto-detect HTML content if format is not provided', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: [{ translations: [{ text: '<p>Привіт</p>' }] }],
      } as any);

      const res = await service.translate('<p>Hello</p>', null, 'uk');

      expect(res).toBe('<p>Привіт</p>');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          params: expect.objectContaining({
            textType: 'html',
          }),
        })
      );
    });
  });
});
