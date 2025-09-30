import { GraphQLError, GraphQLList, GraphQLBoolean } from 'graphql';
import { RecordType } from '../types';
import { Record } from '@models';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { getAccessibleFields } from '@utils/form';
import { logger } from '@services/logger.service';
import { accessibleBy } from '@casl/mongoose';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';

/** Arguments for the records query */
type RecordsArgs = {
  draft?: boolean;
};

/**
 * List all records available for the logged user.
 * Throw GraphQL error if not logged.
 */
export default {
  type: new GraphQLList(RecordType),
  args: {
    draft: { type: GraphQLBoolean },
  },
  async resolve(parent, args: RecordsArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      const ability = await extendAbilityForRecords(user);

      const filter = accessibleBy(ability, 'read').Record;

      Object.assign(filter, { archived: { $ne: true } });
      if (args.draft !== undefined) {
        Object.assign(filter, { draft: args.draft });
      }

      const records = await Record.find(filter);
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
