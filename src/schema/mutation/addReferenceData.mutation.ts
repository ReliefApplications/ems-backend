import { GraphQLNonNull, GraphQLString, GraphQLError } from 'graphql';
import { Form, ReferenceData } from '@models';
import { ReferenceDataType } from '../types';
import { AppAbility } from '@security/defineUserAbility';
import { validateGraphQLTypeName } from '@utils/validators';

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
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
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
          throw new GraphQLError(
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
        return referenceData.save();
      }
      throw new GraphQLError(
        context.i18next.t('mutations.reference.add.errors.invalidArguments')
      );
    } else {
      throw new GraphQLError(
        context.i18next.t('common.errors.permissionNotGranted')
      );
    }
  },
};
