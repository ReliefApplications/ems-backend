import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import { Resource, Form } from '@models';
import { LayoutType } from '../../schema/types';
import { AppAbility } from '@security/defineUserAbility';
import { LayoutInputType, LayoutArgs } from '../../schema/inputs/layout.input';
import { logger } from '@services/logger.service';
import { accessibleBy } from '@casl/mongoose';
import { Types } from 'mongoose';

/** Arguments for the addLayout mutation */
type AddLayoutArgs = {
  layout: LayoutArgs;
  resource?: string | Types.ObjectId;
  form?: string | Types.ObjectId;
};

/**
 * Add new grid layout.
 * Throw an error if user not connected.
 */
export default {
  type: LayoutType,
  args: {
    layout: { type: new GraphQLNonNull(LayoutInputType) },
    resource: { type: GraphQLID },
    form: { type: GraphQLID },
  },
  async resolve(parent, args: AddLayoutArgs, context) {
    try {
      if (args.form && args.resource) {
        throw new GraphQLError(
          context.i18next.t(
            'mutations.layout.add.errors.invalidAddPageArguments'
          )
        );
      }
      const user = context.user;
      if (!user) {
        throw new GraphQLError(
          context.i18next.t('common.errors.userNotLogged')
        );
      }
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
        resource.layouts.push(args.layout);
        await resource.save();
        return resource.layouts.pop();
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
        form.layouts.push(args.layout);
        await form.save();
        return form.layouts.pop();
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
