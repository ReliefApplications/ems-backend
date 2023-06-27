import { GraphQLError, GraphQLList } from 'graphql';
import { RecordType } from '../types';
import { Record } from '@models';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { getAccessibleFields } from '@utils/form';
import { logger } from '@services/logger.service';

/**
 * List all records available for the logged user.
 * Throw GraphQL error if not logged.
 */
export default {
  type: new GraphQLList(RecordType),
  async resolve(parent, args, context) {
    try {
      // Authentication check
      const user = context.user;
      console.log('user ==========>>>', JSON.stringify(user));
      console.log('context ===New=======>>>', JSON.stringify(context));
      if (!user) {
        throw new GraphQLError(
          context.i18next.t('common.errors.userNotLogged')
        );
      }

      const ability = await extendAbilityForRecords(user);
      // Return the records
      const records = await Record.accessibleBy(ability, 'read').find();
      return getAccessibleFields(records, ability);
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      if (err instanceof GraphQLError) {
        throw new GraphQLError(err.message);
      }
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
