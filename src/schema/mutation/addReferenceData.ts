import { GraphQLNonNull, GraphQLString, GraphQLError } from 'graphql';
import { ReferenceData } from '../../models';
import { ReferenceDataType } from '../types';
import { AppAbility } from '../../security/defineAbilityFor';
import { toGraphQLCase } from '../../utils/validators';

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
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }
    // check the permissions
    const ability: AppAbility = user.ability;
    if (ability.cannot('create', 'ReferenceData')) {
      throw new GraphQLError(context.i18next.t('errors.permissionNotGranted'));
    }
    // check a name is given
    if (!args.name) {
      throw new GraphQLError(
        context.i18next.t('errors.invalidAddReferenceDataArguments')
      );
    }
    // check the graphql name
    const graphQLName = toGraphQLCase(args.name);
    const sameName = await ReferenceData.findOne({ graphQLName });
    if (sameName) {
      throw new GraphQLError(
        context.i18next.t('errors.referenceDataDuplicated')
      );
    }
    // save the new object
    const referenceData = new ReferenceData({
      name: args.name,
      graphQLName,
      modifiedAt: new Date(),
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
  },
};
