import { getChoices } from '@utils/proxy/getChoices';
import commonServices from '@server/common-services';
import fetch from 'node-fetch';
import axios from 'axios';
import { Request } from 'express';

jest.mock('node-fetch', () => jest.fn());
jest.mock('axios', () => {
  const originalAxios = jest.requireActual('axios');
  return {
    __esModule: true,
    ...originalAxios,
    default: jest.fn(),
  };
});
jest.mock('@server/common-services', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('config', () => {
  const originalConfig = jest.requireActual('config');
  return {
    ...originalConfig,
    get: jest.fn((setting: string) =>
      setting === 'commonServices.url' ? 'https://common-services.test' : null
    ),
    util: {
      getEnv: jest.fn(() => 'development'),
    },
  };
});

describe('Get choices', () => {
  const req = {
    headers: {
      authorization: 'Bearer userToken',
      accesstoken: 'mockAccessToken',
    },
  } as unknown as Request;
  const commonServicesSender = jest.fn();

  /** @returns headers passed to the last fetch call */
  const getFetchHeaders = () =>
    (fetch as unknown as jest.Mock).mock.calls[0][1].headers;

  beforeEach(() => {
    jest.clearAllMocks();
    (commonServices as jest.Mock).mockReturnValue(commonServicesSender);
  });

  describe('choices by URL', () => {
    const mockFetchResponse = (json: any) => {
      (fetch as unknown as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue(json),
      });
    };

    it('should fetch choices and map value & text fields', async () => {
      mockFetchResponse([
        { id: '2', name: 'B' },
        { id: '1', name: 'A' },
      ]);

      const result = await getChoices(req, {
        choicesByUrl: {
          url: 'https://example.com/api/choices',
          value: 'id',
          text: 'name',
        },
      });

      expect(fetch).toHaveBeenCalledWith(
        'https://example.com/api/choices',
        expect.objectContaining({ method: 'get' })
      );
      // Choices must be sorted by text
      expect(result).toEqual([
        { value: '1', text: 'A' },
        { value: '2', text: 'B' },
      ]);
    });

    it('should extract choices from a nested path', async () => {
      mockFetchResponse({
        data: { items: [{ id: '1', name: 'A' }] },
      });

      const result = await getChoices(req, {
        choicesByUrl: {
          url: 'https://example.com/api/choices',
          path: 'data.items',
          value: 'id',
          text: 'name',
        },
      });

      expect(result).toEqual([{ value: '1', text: 'A' }]);
    });

    it('should fall back to value field as text when no text field', async () => {
      mockFetchResponse([{ id: 'b' }, { id: 'a' }]);

      const result = await getChoices(req, {
        choicesByUrl: {
          url: 'https://example.com/api/choices',
          value: 'id',
        },
      });

      expect(result).toEqual([
        { value: 'a', text: 'a' },
        { value: 'b', text: 'b' },
      ]);
    });

    it('should use raw items when no value nor text fields', async () => {
      mockFetchResponse(['b', 'a']);

      const result = await getChoices(req, {
        choicesByUrl: { url: 'https://example.com/api/choices' },
      });

      expect(result).toEqual([
        { value: 'a', text: 'a' },
        { value: 'b', text: 'b' },
      ]);
    });

    it('should authenticate with access token for common services URLs', async () => {
      mockFetchResponse([]);

      await getChoices(req, {
        choicesByUrl: { url: 'https://common-services.test/api/choices' },
      });

      const headers = getFetchHeaders();
      expect(headers.get('Authorization')).toBe('Bearer mockAccessToken');
      expect(headers.get('Content-Type')).toBe('application/json');
    });

    it('should forward authorization & access token headers for other URLs', async () => {
      mockFetchResponse([]);

      await getChoices(req, {
        choicesByUrl: { url: 'https://example.com/api/choices' },
      });

      const headers = getFetchHeaders();
      expect(headers.get('Authorization')).toBe('Bearer userToken');
      expect(headers.get('accesstoken')).toBe('mockAccessToken');
    });

    it('should not set access token header when request has none', async () => {
      mockFetchResponse([]);

      await getChoices(
        {
          headers: { authorization: 'Bearer userToken' },
        } as unknown as Request,
        { choicesByUrl: { url: 'https://example.com/api/choices' } }
      );

      const headers = getFetchHeaders();
      expect(headers.get('Authorization')).toBe('Bearer userToken');
      expect(headers.get('accesstoken')).toBeFalsy();
    });

    it('should return an empty array when the request fails', async () => {
      (fetch as unknown as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const result = await getChoices(req, {
        choicesByUrl: { url: 'https://example.com/api/choices' },
      });

      expect(result).toEqual([]);
    });

    it('should return an empty array when the path does not exist', async () => {
      mockFetchResponse({ data: [] });

      const result = await getChoices(req, {
        choicesByUrl: {
          url: 'https://example.com/api/choices',
          path: 'wrong.path',
        },
      });

      expect(result).toEqual([]);
    });
  });

  describe('choices by GraphQL', () => {
    const field = {
      choicesByGraphQL: {
        url: 'https://example.com/graphql',
        query: 'query { items { id name } }',
        path: '$.items[*]',
        value: 'id',
        text: 'name',
      },
    };

    it('should post the query and map choices from the response', async () => {
      (axios as unknown as jest.Mock).mockResolvedValue({
        data: {
          items: [
            { id: '2', name: 'B' },
            { id: '1', name: 'A' },
          ],
        },
      });

      const result = await getChoices(req, field);

      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://example.com/graphql',
          method: 'post',
          data: { query: field.choicesByGraphQL.query },
        })
      );
      // Choices must be sorted by text
      expect(result).toEqual([
        { value: '1', text: 'A' },
        { value: '2', text: 'B' },
      ]);
    });

    it('should forward authorization & access token headers for other URLs', async () => {
      (axios as unknown as jest.Mock).mockResolvedValue({ data: {} });

      await getChoices(req, field);

      const headers = (axios as unknown as jest.Mock).mock.calls[0][0].headers;
      expect(headers.get('Authorization')).toBe('Bearer userToken');
      expect(headers.get('accesstoken')).toBe('mockAccessToken');
      expect(commonServices).not.toHaveBeenCalled();
    });

    it('should use common services sender & access token for common services URLs', async () => {
      commonServicesSender.mockResolvedValue({
        data: { items: [{ id: '1', name: 'A' }] },
      });

      const result = await getChoices(req, {
        choicesByGraphQL: {
          ...field.choicesByGraphQL,
          url: 'https://common-services.test/graphql',
        },
      });

      expect(commonServicesSender).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://common-services.test/graphql',
          method: 'post',
        })
      );
      expect(axios).not.toHaveBeenCalled();
      const headers = commonServicesSender.mock.calls[0][0].headers;
      expect(headers.get('Authorization')).toBe('Bearer mockAccessToken');
      expect(result).toEqual([{ value: '1', text: 'A' }]);
    });

    it('should return an empty array when the path matches nothing', async () => {
      (axios as unknown as jest.Mock).mockResolvedValue({ data: {} });

      const result = await getChoices(req, field);

      expect(result).toEqual([]);
    });

    it('should return an empty array when the request fails', async () => {
      (axios as unknown as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const result = await getChoices(req, field);

      expect(result).toEqual([]);
    });
  });
});
