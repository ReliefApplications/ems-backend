import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import { Resource, Form } from '@models';
import { LayoutType } from '../../schema/types';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@lib/logger';
import { accessibleBy } from '@casl/mongoose';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

/** Arguments for the deleteLayout mutation */
type DeleteLayoutArgs = {
  id: string | Types.ObjectId;
  resource?: string | Types.ObjectId;
  form?: string | Types.ObjectId;
};

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
  async resolve(parent, args: DeleteLayoutArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      if (args.form && args.resource) {
        throw new GraphQLError(
          context.i18next.t('mutations.layout.delete.errors.invalidArguments')
        );
      }
      const user = context.user;
      const ability: AppAbility = user.ability;
      // Edition of a resource
      if (args.resource) {
        const filters = Resource.find(accessibleBy(ability, 'update').Resource)
          .where({ _id: args.resource })
          .getFilter();
        const resource: Resource = await Resource.findOne(filters);
        if (!resource) {
          throw new GraphQLError(
            context.i18next.t('common.errors.permissionNotGranted')
          );
        }
        const layout = resource.layouts.id(args.id).deleteOne();
        await resource.save();
        return layout;
      } else {
        // Edition of a Form
        const filters = Form.find(accessibleBy(ability, 'update').Form)
          .where({ _id: args.form })
          .getFilter();
        const form: Form = await Form.findOne(filters);
        if (!form) {
          throw new GraphQLError(
            context.i18next.t('common.errors.permissionNotGranted')
          );
        }
        const layout = form.layouts.id(args.id).deleteOne();
        await form.save();
        return layout;
      }
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      if (err instanceof GraphQLError) {
        throw new GraphQLError(err.message);
      }
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
