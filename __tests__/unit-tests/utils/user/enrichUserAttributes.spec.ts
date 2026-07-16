import { User } from '@models';
import commonServices from '@server/common-services';
import { logger } from '@services/logger.service';
import { getGraphqlUrl, getToken } from '@utils/commonServices';
import { enrichUserAttributes } from '@utils/user/enrichUserAttributes';

jest.mock('@services/logger.service');
jest.mock('@utils/commonServices', () => ({
  getToken: jest.fn(),
  getGraphqlUrl: jest.fn(),
}));
jest.mock('@server/common-services', () => {
  const request = jest.fn();
  return { __esModule: true, default: jest.fn(() => request) };
});

/** Shared axios instance returned by the common-services module mock */
const requestMock = (commonServices as jest.Mock)() as jest.Mock;

const COUNTRIES = [
  { id: '1', name: 'France', iso2code: 'FR', iso3code: 'FRA' },
  { id: '2', name: 'Belgium', iso2code: 'BE', iso3code: 'BEL' },
];
const REGIONS = [
  { id: '10', name: 'Europe' },
  { id: '20', name: 'Africa' },
];

/**
 * Mock the responses of the common-services GraphQL API.
 *
 * @param options Mock options
 * @param options.countries Countries returned by the API, or an error to throw
 * @param options.regions Regions returned by the API, or an error to throw
 */
const mockCommonServices = ({
  countries = COUNTRIES,
  regions = REGIONS,
}: {
  countries?: any;
  regions?: any;
} = {}) => {
  requestMock.mockImplementation(async ({ data }: any) => {
    if (data.query.includes('countrys')) {
      if (countries instanceof Error) throw countries;
      return { data: { data: { countrys: countries } } };
    }
    if (data.query.includes('regions')) {
      if (regions instanceof Error) throw regions;
      return { data: { data: { regions } } };
    }
    throw new Error(`Unexpected query: ${data.query}`);
  });
};

/**
 * Build a minimal user object exposing what enrichUserAttributes uses.
 *
 * @param attributes Initial user attributes
 * @returns user stub
 */
const buildUser = (attributes: any): User =>
  ({ attributes, markModified: jest.fn() } as unknown as User);

describe('enrichUserAttributes', () => {
  beforeEach(() => {
    (getToken as jest.Mock).mockResolvedValue('mock-token');
    (getGraphqlUrl as jest.Mock).mockReturnValue(
      'https://common-services/graphql'
    );
    mockCommonServices();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should add country and region metadata to the user attributes', async () => {
    const user = buildUser({ country: 'France', region: 'Europe' });

    const modified = await enrichUserAttributes(user);

    expect(modified).toBe(true);
    expect(user.attributes).toEqual({
      country: 'France',
      region: 'Europe',
      'country.id': '1',
      'country.name': 'France',
      'country.iso2code': 'FR',
      'country.iso3code': 'FRA',
      'region.id': '10',
      'region.name': 'Europe',
    });
    expect(user.markModified).toHaveBeenCalledWith('attributes');
  });

  it('should match country and region names case-insensitively', async () => {
    const user = buildUser({ country: 'fRaNcE', region: 'EUROPE' });

    const modified = await enrichUserAttributes(user);

    expect(modified).toBe(true);
    expect(user.attributes['country.id']).toBe('1');
    expect(user.attributes['region.id']).toBe('10');
  });

  it('should only enrich the country when the user has no region', async () => {
    const user = buildUser({ country: 'Belgium' });

    const modified = await enrichUserAttributes(user);

    expect(modified).toBe(true);
    expect(user.attributes).toEqual({
      country: 'Belgium',
      'country.id': '2',
      'country.name': 'Belgium',
      'country.iso2code': 'BE',
      'country.iso3code': 'BEL',
    });
    // Regions should not even be fetched
    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(requestMock.mock.calls[0][0].data.query).toContain('countrys');
  });

  it('should only enrich the region when the user has no country', async () => {
    const user = buildUser({ region: 'Africa' });

    const modified = await enrichUserAttributes(user);

    expect(modified).toBe(true);
    expect(user.attributes).toEqual({
      region: 'Africa',
      'region.id': '20',
      'region.name': 'Africa',
    });
    // Countries should not even be fetched
    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(requestMock.mock.calls[0][0].data.query).toContain('regions');
  });

  it('should not report a modification when there is nothing to enrich', async () => {
    const user = buildUser({ department: 'HR' });

    const modified = await enrichUserAttributes(user);

    expect(modified).toBe(false);
    expect(user.attributes).toEqual({ department: 'HR' });
    expect(user.markModified).not.toHaveBeenCalled();
    expect(requestMock).not.toHaveBeenCalled();
  });

  it('should initialize missing attributes and not report a modification', async () => {
    const user = buildUser(undefined);

    const modified = await enrichUserAttributes(user);

    expect(modified).toBe(false);
    expect(user.attributes).toEqual({});
    expect(user.markModified).not.toHaveBeenCalled();
  });

  it('should not add anything for an unknown country', async () => {
    const user = buildUser({ country: 'Atlantis' });

    const modified = await enrichUserAttributes(user);

    expect(modified).toBe(false);
    expect(user.attributes).toEqual({ country: 'Atlantis' });
    expect(user.markModified).not.toHaveBeenCalled();
  });

  it('should clear stale enriched keys when the country was removed', async () => {
    const user = buildUser({
      'country.id': '1',
      'country.name': 'France',
      'country.iso2code': 'FR',
      'country.iso3code': 'FRA',
      'region.id': '10',
      'region.name': 'Europe',
    });

    const modified = await enrichUserAttributes(user);

    expect(modified).toBe(true);
    expect(user.attributes).toEqual({});
    expect(user.markModified).toHaveBeenCalledWith('attributes');
    expect(requestMock).not.toHaveBeenCalled();
  });

  it('should replace stale enriched keys when the country changed', async () => {
    const user = buildUser({
      country: 'Belgium',
      'country.id': '1',
      'country.name': 'France',
      'country.iso2code': 'FR',
      'country.iso3code': 'FRA',
    });

    const modified = await enrichUserAttributes(user);

    expect(modified).toBe(true);
    expect(user.attributes).toEqual({
      country: 'Belgium',
      'country.id': '2',
      'country.name': 'Belgium',
      'country.iso2code': 'BE',
      'country.iso3code': 'BEL',
    });
  });

  it('should clear stale enriched keys when the lookup no longer matches', async () => {
    const user = buildUser({
      country: 'Atlantis',
      'country.id': '1',
      'country.name': 'France',
      'country.iso2code': 'FR',
      'country.iso3code': 'FRA',
    });

    const modified = await enrichUserAttributes(user);

    expect(modified).toBe(true);
    expect(user.attributes).toEqual({ country: 'Atlantis' });
    expect(user.markModified).toHaveBeenCalledWith('attributes');
  });

  it('should still enrich the region when fetching countries fails', async () => {
    mockCommonServices({ countries: new Error('Service unavailable') });
    const user = buildUser({ country: 'France', region: 'Europe' });

    const modified = await enrichUserAttributes(user);

    expect(modified).toBe(true);
    expect(user.attributes).toEqual({
      country: 'France',
      region: 'Europe',
      'region.id': '10',
      'region.name': 'Europe',
    });
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('failed to fetch countries')
    );
  });

  it('should not report a modification when the only fetch fails', async () => {
    mockCommonServices({ countries: new Error('Service unavailable') });
    const user = buildUser({ country: 'France' });

    const modified = await enrichUserAttributes(user);

    expect(modified).toBe(false);
    expect(user.attributes).toEqual({ country: 'France' });
    expect(user.markModified).not.toHaveBeenCalled();
  });

  it('should log and return false instead of propagating unexpected errors', async () => {
    const user = buildUser({});
    (user.markModified as jest.Mock).mockImplementation(() => {
      throw new Error('Unexpected mongoose error');
    });
    user.attributes['country.id'] = 'stale';

    const modified = await enrichUserAttributes(user);

    expect(modified).toBe(false);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('enrichUserAttributes failed')
    );
  });
});
