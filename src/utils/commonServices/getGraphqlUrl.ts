import config from 'config';

/**
 * Build the common-services GraphQL endpoint URL from the configured base URL.
 * Safe against trailing slashes in `commonServices.url` — they are stripped
 * before appending `/graphql/`, so the result never contains `//graphql/`.
 *
 * @returns the GraphQL endpoint URL.
 */
export const getGraphqlUrl = (): string => {
  const base = config.get<string>('commonServices.url').replace(/\/+$/, '');
  return `${base}/graphql/`;
};
