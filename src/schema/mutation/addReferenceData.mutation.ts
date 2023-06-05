import { GraphQLNonNull, GraphQLString, GraphQLError } from 'graphql';
import { Form, ReferenceData } from '@models';
import { ReferenceDataType } from '../types';
import { AppAbility } from '@security/defineUserAbility';
import { validateGraphQLTypeName } from '@utils/validators';
import { logger } from '@services/logger.service';
import { GraphQLHandlingError } from '@utils/schema/errors/interfaceOfErrorHandling.util';

/**
 * Creates a new referenceData.
 * Throws an error if not logged or authorized, or arguments are invalid.
 */
export default {
  type: ReferenceDataType,
  args: {
    name: { type: new GraphQLNonNull(GraphQLString) },
  },
  async resolve(parent, args, context) {
    try {
      const user = context.user;
      if (!user) {
        throw new GraphQLHandlingError(
          context.i18next.t('common.errors.userNotLogged')
        );
      }
      const ability: AppAbility = user.ability;
      if (ability.can('create', 'ReferenceData')) {
        if (args.name !== '') {
          // Check name
          const graphQLTypeName = ReferenceData.getGraphQLTypeName(args.name);
          validateGraphQLTypeName(graphQLTypeName, context.i18next);
          if (
            (await Form.hasDuplicate(graphQLTypeName)) ||
            (await ReferenceData.hasDuplicate(graphQLTypeName))
          ) {
            throw new GraphQLHandlingError(
              context.i18next.t('common.errors.duplicatedGraphQLTypeName')
            );
          }

          // Create reference data model
          const referenceData = new ReferenceData({
            name: args.name,
            graphQLTypeName: ReferenceData.getGraphQLTypeName(args.name),
            //modifiedAt: new Date(),
            type: undefined,
            valueField: '',
            fields: [],
            apiConfiguration: null,
            path: '',
            query: '',
            data: [],
            permissions: {
              canSee: [],
              canUpdate: [],
              canDelete: [],
            },
          });
          return await referenceData.save();
        }
        throw new GraphQLHandlingError(
          context.i18next.t('mutations.reference.add.errors.invalidArguments')
        );
      } else {
        throw new GraphQLHandlingError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }
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
