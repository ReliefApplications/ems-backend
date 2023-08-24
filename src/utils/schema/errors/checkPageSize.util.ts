import config from 'config';
import { GraphQLError } from 'graphql';
import i18next from 'i18next';

/**
 * Check pagination maximum limit of data.
 * Throw pagination maximum limit cross than error.
 *
 * @param maxLimit Question maxLimit number
 */
export const checkPageSize = (maxLimit: number): void => {
  const maxPaginationLimit = config.get<number>('server.pagination.limit');
  if (maxLimit > maxPaginationLimit) {
    throw new GraphQLError(
      i18next.t('common.errors.maximumPaginationLimit', {
        paginationLimit: maxPaginationLimit,
      })
    );
  }
};

export default checkPageSize;
