import { GraphQLNonNull, GraphQLString, GraphQLError } from 'graphql';
import { ReferenceData } from '../../models';
import { ReferenceDataType } from '../types';
import { AppAbility } from '../../security/defineAbilityFor';

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
    const ability: AppAbility = user.ability;
    if (ability.can('create', 'ReferenceData')) {
      if (args.name !== '') {
        const referenceData = new ReferenceData({
          name: args.name,
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
      }
      throw new GraphQLError(
        context.i18next.t('errors.invalidAddReferenceDataArguments')
      );
    } else {
      throw new GraphQLError(context.i18next.t('errors.permissionNotGranted'));
    }
  },
};
