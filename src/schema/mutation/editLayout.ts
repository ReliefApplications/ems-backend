import errors from '../../const/errors';
import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import { Resource, Form } from '../../models';
import { LayoutType } from '../../schema/types';
import { AppAbility } from '../../security/defineAbilityFor';
import LayoutInputType from '../../schema/inputs/layout.input';

/**
 * Edits an existing layout.
 */
export default {
  type: LayoutType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    layout: { type: new GraphQLNonNull(LayoutInputType) },
    resource: { type: GraphQLID },
    form: { type: GraphQLID },
  },
  async resolve(parent, args, context) {
    if (args.form && args.resource) {
      throw new GraphQLError(errors.invalidAddPageArguments);
    }
    const user = context.user;
    if (!user) {
      throw new GraphQLError(errors.userNotLogged);
    }
    const ability: AppAbility = user.ability;
    // Edition of a resource
    if (args.resource) {
      const filters = Resource.accessibleBy(ability, 'update')
        .where({ _id: args.resource })
        .getFilter();
      const resource: Resource = await Resource.findOne(filters);
      if (!resource) {
        throw new GraphQLError(errors.permissionNotGranted);
      }
      resource.layouts.id(args.id).name = args.layout.name;
      resource.layouts.id(args.id).query = args.layout.query;
      await resource.save();
      return resource.layouts.id(args.id);
    } else {
      // Edition of a Form
      const filters = Form.accessibleBy(ability, 'update')
        .where({ _id: args.form })
        .getFilter();
      const form: Form = await Form.findOne(filters);
      if (!form) {
        throw new GraphQLError(errors.permissionNotGranted);
      }
      const layout = form.layouts.id(args.id).update(args.layout);
      await form.save();
      return layout;
    }
  },
};
