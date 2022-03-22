import { GraphQLNonNull, GraphQLString, GraphQLError } from 'graphql';
import errors from '../../const/errors';
import { ReferenceData } from '../../models';
import { ReferenceDataType } from '../types';
import { AppAbility } from '../../security/defineAbilityFor';
import { authType, status } from '../../const/enumTypes';
import { validateApi } from '../../utils/validators/validateApi';

export default {
  /*  Creates a new referenceData.
      Throws an error if not logged or authorized, or arguments are invalid.
  */
  type: ReferenceDataType,
  args: {
    name: { type: new GraphQLNonNull(GraphQLString) },
  },
  async resolve(parent, args, context) {
    const user = context.user;
    if (!user) {
      throw new GraphQLError(errors.userNotLogged);
    }
    const ability: AppAbility = user.ability;
    if (ability.can('create', 'ReferenceData')) {
      if (args.name !== '') {
        validateApi(args.name);
        const referenceData = new ReferenceData({
          name: args.name,
          status: status.pending,
          permissions: {
            canSee: [],
            canUpdate: [],
            canDelete: [],
          },
        });
        return referenceData.save();
      }
      throw new GraphQLError(errors.invalidAddReferenceDataArguments);
    } else {
      throw new GraphQLError(errors.permissionNotGranted);
    }
  },
};
