import axios from 'axios';
import { logger } from '@services/logger.service';
import { convertUrlToBase64 } from '@utils/files';

jest.mock('axios');
jest.mock('@services/logger.service');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('convertUrlToBase64', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return non-string, non-object values untouched', async () => {
    expect(await convertUrlToBase64(null)).toBeNull();
    expect(await convertUrlToBase64(undefined)).toBeUndefined();
    expect(await convertUrlToBase64(42)).toBe(42);
    expect(await convertUrlToBase64(true)).toBe(true);
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it('should leave a string without image urls untouched', async () => {
    const text = '<p>Hello <strong>world</strong></p>';
    expect(await convertUrlToBase64(text)).toBe(text);
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it('should skip images that are already data URLs', async () => {
    const text =
      '<img src="data:image/png;base64,AAAA" alt="already inlined" />';
    expect(await convertUrlToBase64(text)).toBe(text);
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it('should fetch image urls and replace them with base64 data URIs', async () => {
    mockedAxios.get.mockResolvedValue({
      data: Buffer.from('image-bytes', 'binary'),
      headers: { 'content-type': 'image/png' },
    });

    const url = 'https://example.com/image.png';
    const text = `<p>Before <img src="${url}" /> After</p>`;
    const expectedBase64 = Buffer.from('image-bytes', 'binary').toString(
      'base64'
    );

    const result = await convertUrlToBase64(text);

    expect(mockedAxios.get).toHaveBeenCalledWith(url, {
      responseType: 'arraybuffer',
    });
    expect(result).toContain(`data:image/png;base64,${expectedBase64}`);
    expect(result).not.toContain(url);
  });

  it('should convert each string property of a translation object', async () => {
    mockedAxios.get.mockResolvedValue({
      data: Buffer.from('image-bytes', 'binary'),
      headers: { 'content-type': 'image/jpeg' },
    });

    const url = 'https://example.com/photo.jpg';
    const translations = {
      en: `<p>English <img src="${url}" /></p>`,
      uk: '<p>Текст без зображення</p>',
    };
    const expectedBase64 = Buffer.from('image-bytes', 'binary').toString(
      'base64'
    );

    const result = await convertUrlToBase64(translations);

    // en property had its image converted
    expect(result.en).toContain(`data:image/jpeg;base64,${expectedBase64}`);
    expect(result.en).not.toContain(url);
    // uk property left untouched
    expect(result.uk).toBe('<p>Текст без зображення</p>');
    // Only the en property triggered a fetch
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
  });

  it('should keep the original url and log when the fetch fails', async () => {
    mockedAxios.get.mockRejectedValue(new Error('network error'));

    const url = 'https://example.com/broken.png';
    const text = `<img src="${url}" />`;

    const result = await convertUrlToBase64(text);

    expect(result).toBe(text);
    expect(logger.error).toHaveBeenCalled();
  });
});
