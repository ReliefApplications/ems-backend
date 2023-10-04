import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { FormType } from '../types';
import { Form } from '@models';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { logger } from '@services/logger.service';
import { graphQLAuthCheck } from '@schema/shared';

/**
 * Return form from id if available for the logged user.
 * Throw GraphQL error if not logged.
 */
export default {
  type: FormType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      // get data and permissions
      const form = await Form.findById(args.id).populate({
        path: 'resource',
        model: 'Resource',
      });
      if (!form) {
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      }

      const ability = await extendAbilityForRecords(user, form);
      if (ability.cannot('read', form)) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }

      return form;
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
