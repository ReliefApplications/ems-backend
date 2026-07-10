import { User } from '@models';
import commonServices from '../../server/common-services';
import { logger } from '@services/logger.service';
import { getToken, getGraphqlUrl } from '@utils/commonServices';
import { getErrorMessage } from '@utils/error';

/**
 * Enriched attributes (under user.attributes) managed by this module.
 * Exposed through the /permissions/attributes route so they can be selected
 * in access filters; `readonly` marks them as derived (not user-editable).
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const ENRICHED_ATTRIBUTES = [
  { value: 'country.id', text: 'Country (ID)', readonly: true },
  { value: 'country.name', text: 'Country (name)', readonly: true },
  { value: 'country.iso2code', text: 'Country (ISO2)', readonly: true },
  { value: 'country.iso3code', text: 'Country (ISO3)', readonly: true },
  { value: 'region.id', text: 'Region (ID)', readonly: true },
  { value: 'region.name', text: 'Region (name)', readonly: true },
] as const;

/** Enriched keys (under user.attributes) managed by this module. */
const ENRICHED_KEYS = ENRICHED_ATTRIBUTES.map((x) => x.value);

/** A country as returned by the common-services countrys query. */
interface CountryRef {
  id: string;
  name: string;
  iso2code: string;
  iso3code: string;
}

/** A region as returned by the common-services regions query. */
interface RegionRef {
  id: string;
  name: string;
}

/**
 * Run a GraphQL query against the common-services API using the shared
 * axios instance, which caches responses for 5 minutes.
 *
 * @param query GraphQL query string.
 * @returns the `data` payload of the response.
 */
const queryCommonServices = async <T>(query: string): Promise<T> => {
  const token = await getToken();
  const res = await commonServices()({
    url: getGraphqlUrl(),
    method: 'post',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: { query },
  });
  return res.data?.data;
};

/**
 * Build a case-insensitive name-keyed lookup from a list of reference items.
 *
 * @param items Reference items returned by common-services.
 * @returns lookup keyed by lowercased `name`.
 */
const buildLookup = <T extends { name: string }>(
  items: T[]
): Record<string, T> => {
  const lookup: Record<string, T> = {};
  for (const item of items ?? []) {
    if (item?.name) lookup[item.name.toLowerCase()] = item;
  }
  return lookup;
};

/**
 * Fetch the list of countries from common-services.
 *
 * @returns lookup of countries keyed by lowercased name.
 */
const fetchCountries = async (): Promise<Record<string, CountryRef>> => {
  const data = await queryCommonServices<{ countrys: CountryRef[] }>(`
    query {
      countrys {
        id
        name
        iso2code
        iso3code
      }
    }
  `);
  return buildLookup(data?.countrys ?? []);
};

/**
 * Fetch the list of regions from common-services.
 *
 * @returns lookup of regions keyed by lowercased name.
 */
const fetchRegions = async (): Promise<Record<string, RegionRef>> => {
  const data = await queryCommonServices<{ regions: RegionRef[] }>(`
    query {
      regions {
        id
        name
      }
    }
  `);
  return buildLookup(data?.regions ?? []);
};

/**
 * Resolve common-services metadata for the user's country and region and
 * merge it into `user.attributes` as dot-notation keys
 * (e.g. `user.attributes['country.iso2code']`). The auth flow persists them
 * when this function reports a modification, so permission access filters
 * can rely on them on every request.
 *
 * Failures are logged but never propagated — enrichment must not block login.
 *
 * @param user Logged user to enrich.
 * @returns true if the enriched attributes were modified.
 */
export const enrichUserAttributes = async (user: User): Promise<boolean> => {
  try {
    const countryName: string | undefined = user.attributes?.country;
    const regionName: string | undefined = user.attributes?.region;

    if (!user.attributes) user.attributes = {};

    // Remember which enriched keys existed before so we can persist removals
    // even when no new values get added.
    const hadEnrichedKeys = ENRICHED_KEYS.some(
      (key) => user.attributes[key] !== undefined
    );
    // Clear any previously-enriched keys so stale values do not linger when
    // the user's country/region changes, is removed, or enrichment fails.
    for (const key of ENRICHED_KEYS) delete user.attributes[key];

    if (!countryName && !regionName) {
      if (hadEnrichedKeys) user.markModified('attributes');
      return hadEnrichedKeys;
    }

    const [countries, regions] = await Promise.all([
      countryName
        ? fetchCountries().catch((err) => {
            logger.error(
              `enrichUserAttributes: failed to fetch countries: ${err?.message}`
            );
            return null;
          })
        : null,
      regionName
        ? fetchRegions().catch((err) => {
            logger.error(
              `enrichUserAttributes: failed to fetch regions: ${err?.message}`
            );
            return null;
          })
        : null,
    ]);

    let added = false;
    if (countryName && countries) {
      const c = countries[countryName.toLowerCase()];
      if (c) {
        user.attributes['country.id'] = c.id;
        user.attributes['country.name'] = c.name;
        user.attributes['country.iso2code'] = c.iso2code;
        user.attributes['country.iso3code'] = c.iso3code;
        added = true;
      }
    }
    if (regionName && regions) {
      const r = regions[regionName.toLowerCase()];
      if (r) {
        user.attributes['region.id'] = r.id;
        user.attributes['region.name'] = r.name;
        added = true;
      }
    }

    if (added || hadEnrichedKeys) user.markModified('attributes');
    return added || hadEnrichedKeys;
  } catch (err) {
    logger.error(`enrichUserAttributes failed: ${getErrorMessage(err)}`);
    return false;
  }
};
