import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import errors from '../../const/errors';
import { Application, PositionAttributeCategory } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import { PositionAttributeCategoryType } from '../types';

export default {
  /*  Delete a position attribute category.
        Throw GraphQL error if permission not granted.
    */
  type: PositionAttributeCategoryType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    application: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) { throw new GraphQLError(errors.userNotLogged); }
    const ability: AppAbility = context.user.ability;
    const application = await Application.findById(args.application);
    if (!application) throw new GraphQLError(errors.dataNotFound);
    if (ability.can('update', application)) {
      return PositionAttributeCategory.findByIdAndDelete(args.id);
    } else {
      throw new GraphQLError(errors.permissionNotGranted);
    }
  },
};
