import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import errors from '../../const/errors';
import { ReferenceData } from '../../models';
import { ReferenceDataType } from '../types';
import { AppAbility } from '../../security/defineAbilityFor';
import { buildTypes } from '../../utils/schema';

export default {
  /*  Delete the passed referenceData if authorized.
      Throws an error if not logged or authorized, or arguments are invalid.
  */
  type: ReferenceDataType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    const user = context.user;
    if (!user) {
      throw new GraphQLError(errors.userNotLogged);
    }
    const ability: AppAbility = user.ability;
    const filters = ReferenceData.accessibleBy(ability, 'delete')
      .where({ _id: args.id })
      .getFilter();
    const referenceData = await ReferenceData.findOneAndDelete(filters);
    if (!referenceData) throw new GraphQLError(errors.permissionNotGranted);
    buildTypes();
    return referenceData;
  },
};
