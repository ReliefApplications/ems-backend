import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { FormType } from '../types';
import { Form } from '@models';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { logger } from '@services/logger.service';
import { GraphQLHandlingError } from '@utils/schema/errors/interfaceOfErrorHandling.util';

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
    try {
      // Authentication check
      const user = context.user;
      if (!user) {
        throw new GraphQLHandlingError(
          context.i18next.t('common.errors.userNotLogged')
        );
      }

      // get data and permissions
      const form = await Form.findById(args.id).populate({
        path: 'resource',
        model: 'Resource',
      });
      if (!form) {
        throw new GraphQLHandlingError(
          context.i18next.t('common.errors.dataNotFound')
        );
      }

      const ability = await extendAbilityForRecords(user, form);
      if (ability.cannot('read', form)) {
        throw new GraphQLHandlingError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }

      return form;
    } catch (err) {
      if (err instanceof GraphQLHandlingError) {
        throw new GraphQLError(err.message);
      }

      logger.error(err.message, { stack: err.stack });
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
