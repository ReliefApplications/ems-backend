import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { ResourceType } from '../types';
import { Form, Resource } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import mongoose from 'mongoose';

export default {
  /*  Returns resource from id if available for the logged user.
        Throw GraphQL error if not logged.
    */
  type: ResourceType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const ability: AppAbility = context.user.ability;
    const filterReturn = Resource.where({ _id: args.id }).getFilter();
    const resourceToReturn = await Resource.findOne(filterReturn);
    let canRead = false;
    //Check global resource permission
    if (ability.can('read', resourceToReturn)) {
      canRead = true;
    } else {
      //Check per records permission
      const form = await Form.findOne({ resource: resourceToReturn.id });
      const roles = context.user.roles.map((x) =>
        mongoose.Types.ObjectId(x._id)
      );
      canRead =
        form.permissions.canSeeRecords.length > 0
          ? form.permissions.canSeeRecords.some((x) => roles.includes(x))
          : false;
    }
    if (!canRead) {
      throw new GraphQLError(context.i18next.t('errors.permissionNotGranted'));
    }
    //Return resource if user can see it
    return resourceToReturn;
  },
};
