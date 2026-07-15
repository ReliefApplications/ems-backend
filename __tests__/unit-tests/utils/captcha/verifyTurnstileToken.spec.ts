import axios from 'axios';
import config from 'config';
import { verifyTurnstileToken } from '@utils/captcha';
import { logger } from '@services/logger.service';

jest.mock('axios');
jest.mock('@services/logger.service');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('verifyTurnstileToken', () => {
  let configGetSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    configGetSpy = jest.spyOn(config, 'get').mockReturnValue('test-secret');
  });

  afterEach(() => {
    configGetSpy.mockRestore();
  });

  it('should return false and skip the API call if the secret is not configured', async () => {
    configGetSpy.mockReturnValue('');
    const result = await verifyTurnstileToken('some-token');
    expect(result).toBe(false);
    expect(mockedAxios.post).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalled();
  });

  it('should return true when the verification succeeds', async () => {
    mockedAxios.post.mockResolvedValue({ data: { success: true } });
    const result = await verifyTurnstileToken('valid-token');
    expect(result).toBe(true);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      { secret: 'test-secret', response: 'valid-token' },
      expect.objectContaining({ timeout: expect.any(Number) })
    );
  });

  it('should include the remote ip in the verification request when provided', async () => {
    mockedAxios.post.mockResolvedValue({ data: { success: true } });
    await verifyTurnstileToken('valid-token', '1.2.3.4');
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.any(String),
      {
        secret: 'test-secret',
        response: 'valid-token',
        remoteip: '1.2.3.4',
      },
      expect.anything()
    );
  });

  it('should return false when the verification fails', async () => {
    mockedAxios.post.mockResolvedValue({
      data: { success: false, 'error-codes': ['invalid-input-response'] },
    });
    const result = await verifyTurnstileToken('invalid-token');
    expect(result).toBe(false);
  });

  it('should return false when the verification request throws', async () => {
    mockedAxios.post.mockRejectedValue(new Error('network error'));
    const result = await verifyTurnstileToken('valid-token');
    expect(result).toBe(false);
    expect(logger.error).toHaveBeenCalled();
  });
});
