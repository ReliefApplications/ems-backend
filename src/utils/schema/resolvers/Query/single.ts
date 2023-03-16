import { GraphQLError } from 'graphql';
import { Record } from '@models';

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
    return Record.findOne({ _id: id, archived: { $ne: true } });
  };
