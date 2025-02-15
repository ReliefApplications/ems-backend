import { authType } from '@const/enumTypes';
import { ApiConfiguration } from '@models/apiConfiguration.model';
import { logger } from '@services/logger.service';
import { fetchGroups } from '@utils/user/fetchGroups';
import axios from 'axios';
import { getToken } from '@utils/proxy/authManagement';
import { Group } from '@models/group.model';
import jsonpath from 'jsonpath';

jest.mock('@services/logger.service');
jest.mock('axios');
jest.mock('@models/apiConfiguration.model', () => ({
  ApiConfiguration: {
    findById: jest.fn(),
  },
}));
jest.mock('@models/group.model', () => ({
  Group: jest.fn(),
}));
jest.mock('config', () => {
  const originalConfig = jest.requireActual('config');
  const configMock = {
    apiConfiguration: 'mockApiConfigID',
    endpoint: '/groups',
    path: '$.groups[*]',
    id: '$.id',
    title: '$.title',
    description: '$.description',
  };
  return {
    ...originalConfig,
    get: jest.fn(() => {
      return configMock;
    }),
    util: {
      getEnv: jest.fn((settings: string) => {
        return settings ? 'development' : 'production';
      }),
    },
  };
});
jest.mock('@utils/proxy/authManagement', () => ({
  getToken: jest.fn(),
}));

describe('Fetch Groups', () => {
  const apiConfiguration = {
    authType: authType.serviceToService,
    endpoint: 'https://example.com/api',
  };
  const mockToken = 'mockToken';
  const mockApiResponse = {
    groups: [{ id: '1', title: 'Group 1', description: 'Desc 1' }],
  };
  const mockGroups = [{ oid: '1', title: 'Group 1', description: 'Desc 1' }];

  beforeEach(() => {
    jest.clearAllMocks();
    (ApiConfiguration.findById as jest.Mock).mockResolvedValue(
      apiConfiguration
    );
    (getToken as jest.Mock).mockResolvedValue(mockToken);
    (axios as any).mockResolvedValue({ data: mockApiResponse });
    (Group as any).mockImplementation((value: any) => value);
  });

  it('should fetch groups using service-to-service auth', async () => {
    const querySpy = jest.spyOn(jsonpath, 'query');

    const result = await fetchGroups();

    expect(ApiConfiguration.findById).toHaveBeenCalledWith('mockApiConfigID');
    expect(getToken).toHaveBeenCalledWith(apiConfiguration);
    expect(axios).toHaveBeenCalledWith({
      url: 'https://example.com/api/groups',
      method: 'get',
      headers: { Authorization: `Bearer ${mockToken}` },
    });
    expect(querySpy).toHaveBeenCalledWith(mockApiResponse, '$.groups[*]');
    expect(Group).toHaveBeenCalledWith(mockGroups[0]);
    expect(result).toEqual(mockGroups);
  });

  it('should fetch groups using public auth', async () => {
    (ApiConfiguration.findById as jest.Mock).mockResolvedValueOnce({
      ...apiConfiguration,
      authType: authType.public,
    });

    const querySpy = jest.spyOn(jsonpath, 'query');

    const result = await fetchGroups();

    expect(ApiConfiguration.findById).toHaveBeenCalledWith('mockApiConfigID');
    expect(axios).toHaveBeenCalledWith({
      url: 'https://example.com/api/groups',
      method: 'get',
    });
    expect(querySpy).toHaveBeenCalledWith(mockApiResponse, '$.groups[*]');
    expect(Group).toHaveBeenCalledWith(mockGroups[0]);
    expect(result).toEqual(mockGroups);
  });

  it('should throw an error if API configuration not found', async () => {
    (ApiConfiguration.findById as jest.Mock).mockResolvedValueOnce(undefined);

    await expect(fetchGroups()).rejects.toThrowError();

    expect(ApiConfiguration.findById).toHaveBeenCalledWith('mockApiConfigID');
    expect(logger.error).toHaveBeenCalledWith(
      'API Configuration does not exist'
    );
  });

  it('should throw an error for unsupported authType', async () => {
    (ApiConfiguration.findById as jest.Mock).mockResolvedValueOnce({
      ...apiConfiguration,
      authType: 'unsupported',
    });

    await expect(fetchGroups()).rejects.toThrowError();

    expect(ApiConfiguration.findById).toHaveBeenCalledWith('mockApiConfigID');
    expect(logger.error).toHaveBeenCalledWith(
      'Failure when fetching groups because of an unsupported API configuration type.'
    );
  });

  it('should throw an error if API call fails', async () => {
    (axios as any).mockRejectedValueOnce(new Error('API error'));

    await expect(fetchGroups()).rejects.toThrowError();

    expect(axios).toHaveBeenCalled();
  });
});
