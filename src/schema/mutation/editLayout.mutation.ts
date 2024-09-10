import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import { Resource, Form } from '@models';
import { LayoutType } from '../../schema/types';
import { AppAbility } from '@security/defineUserAbility';
import { LayoutArgs, LayoutInputType } from '../../schema/inputs/layout.input';
import { logger } from '@lib/logger';
import { accessibleBy } from '@casl/mongoose';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

/** Arguments for the editLayoutNotification mutation */
type EditLayoutArgs = {
  id: string | Types.ObjectId;
  layout: LayoutArgs;
  resource?: string | Types.ObjectId;
  form?: string | Types.ObjectId;
};

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
  async resolve(parent, args: EditLayoutArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      if (args.form && args.resource) {
        throw new GraphQLError(
          context.i18next.t(
            'mutations.layout.edit.errors.invalidAddPageArguments'
          )
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
        resource.layouts.id(args.id).name = args.layout.name;
        resource.layouts.id(args.id).query = args.layout.query;
        resource.layouts.id(args.id).display = args.layout.display;
        await resource.save();
        return resource.layouts.id(args.id);
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
        form.layouts.id(args.id).name = args.layout.name;
        form.layouts.id(args.id).query = args.layout.query;
        form.layouts.id(args.id).display = args.layout.display;
        await form.save();
        return form.layouts.id(args.id);
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
