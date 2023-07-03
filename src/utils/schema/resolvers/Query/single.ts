import { GraphQLError } from 'graphql';
import { Record } from '@models';
import { logger } from '@services/logger.service';

/**
 * Returns a resolver that fetches a record if the users logged
 * or throws an error if not
 *
 * @returns A resolver function that fetches a record by id
 */
export default () =>
  (_, { id }, context) => {
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }
    try {
      return Record.findOne({ _id: id, archived: { $ne: true } });
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      if (err instanceof GraphQLError) {
        throw new GraphQLError(err.message);
      }
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  };
