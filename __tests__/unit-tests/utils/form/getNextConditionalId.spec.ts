import { Record } from '@models';
import { BaseRedisCache } from 'apollo-server-cache-redis';
import { getNextConditionalId } from '@utils/form/getNextConditionalId';

jest.mock('@models');
jest.mock('ioredis', () => jest.fn().mockImplementation(() => ({})));
jest.mock('apollo-server-cache-redis', () => ({
  BaseRedisCache: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
  })),
}));

// getNextConditionalId.ts builds its cache once at module-load time, so grab
// the same instance the module is actually using rather than re-mocking per test.
const mockCache = (BaseRedisCache as jest.Mock).mock.results[0].value;
const mockCacheGet = mockCache.get as jest.Mock;
const mockCacheSet = mockCache.set as jest.Mock;

/** Builds a Record.findOne(...).sort(...).limit(...) mock chain resolving to lastRecordValue */
const mockFindOneChain = (lastRecordValue: string | null) => {
  const doc = lastRecordValue ? { get: () => lastRecordValue } : null;
  (Record.findOne as jest.Mock).mockReturnValue({
    sort: jest.fn().mockReturnValue({
      limit: jest.fn().mockResolvedValue(doc),
    }),
  });
};

describe('getNextConditionalId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generates the first id for a prefix when nothing is cached or stored', async () => {
    mockCacheGet.mockResolvedValue(null);
    mockFindOneChain(null);

    const id = await getNextConditionalId('structureId', 'cecis_number', 'UA', 4);

    expect(id).toBe('UA0001');
    expect(mockCacheSet).toHaveBeenCalledWith('structureId:cecis_number:UA', 'UA0001');
  });

  it('increments from a cached previous value', async () => {
    mockCacheGet.mockResolvedValue('UA0007');

    const id = await getNextConditionalId('structureId', 'cecis_number', 'UA', 4);

    expect(id).toBe('UA0008');
  });

  it('keeps independent counters for two prefixes on the same field', async () => {
    mockCacheGet
      .mockResolvedValueOnce('UA0001')
      .mockResolvedValueOnce('NC000005');

    const idTrue = await getNextConditionalId('structureId', 'cecis_number', 'UA', 4);
    const idFalse = await getNextConditionalId('structureId', 'cecis_number', 'NC', 6);

    expect(idTrue).toBe('UA0002');
    expect(idFalse).toBe('NC000006');
    expect(mockCacheGet).toHaveBeenNthCalledWith(1, 'structureId:cecis_number:UA');
    expect(mockCacheGet).toHaveBeenNthCalledWith(2, 'structureId:cecis_number:NC');
  });

  it('falls back to Mongo when the cache has no value yet', async () => {
    mockCacheGet.mockResolvedValue(null);
    mockFindOneChain('M00042');

    const id = await getNextConditionalId('structureId', 'caseId', 'M', 5);

    expect(id).toBe('M00043');
  });

  it('zero-pads to the configured digit count', async () => {
    mockCacheGet.mockResolvedValue(null);
    mockFindOneChain(null);

    const id = await getNextConditionalId('structureId', 'cecis_number', 'NC', 6);

    expect(id).toBe('NC000001');
  });
});
