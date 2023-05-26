import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import { Resource, Form } from '@models';
import { LayoutType } from '../../schema/types';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@services/logger.service';
import { userNotLogged } from '@utils/schema';

/**
 * Deletes an existing layout.
 * Throw an error if user not connected.
 */
export default {
  type: LayoutType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    resource: { type: GraphQLID },
    form: { type: GraphQLID },
  },
  async resolve(parent, args, context) {
    const user = context.user;
    userNotLogged(user);
    try {
      if (args.form && args.resource) {
        throw new GraphQLError(
          context.i18next.t('mutations.layout.delete.errors.invalidArguments')
        );
      }
      const ability: AppAbility = user.ability;
      // Edition of a resource
      if (args.resource) {
        const filters = Resource.accessibleBy(ability, 'update')
          .where({ _id: args.resource })
          .getFilter();
        const resource: Resource = await Resource.findOne(filters);
        if (!resource) {
          throw new GraphQLError(
            context.i18next.t('common.errors.permissionNotGranted')
          );
        }
        const layout = resource.layouts.id(args.id).remove();
        await resource.save();
        return layout;
      } else {
        // Edition of a Form
        const filters = Form.accessibleBy(ability, 'update')
          .where({ _id: args.form })
          .getFilter();
        const form: Form = await Form.findOne(filters);
        if (!form) {
          throw new GraphQLError(
            context.i18next.t('common.errors.permissionNotGranted')
          );
        }
        const layout = form.layouts.id(args.id).remove();
        await form.save();
        return layout;
      }
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
