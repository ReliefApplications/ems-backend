import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import { Application } from '@models';
import { TemplateType } from '../types';
import { AppAbility } from '@security/defineUserAbility';
import { TemplateInputType, TemplateArgs } from '../inputs/template.input';
import extendAbilityForApplications from '@security/extendAbilityForApplication';
import { logger } from '@services/logger.service';
import { Types } from 'mongoose';

/** Arguments for the editTemplate mutation */
type EditTemplateArgs = {
  id: string | Types.ObjectId;
  application: string;
  template: TemplateArgs;
};

/**
 * Mutation to edit template.
 */
export default {
  type: TemplateType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    application: { type: new GraphQLNonNull(GraphQLID) },
    template: { type: new GraphQLNonNull(TemplateInputType) },
  },
  async resolve(_, args: EditTemplateArgs, context) {
    try {
      const user = context.user;
      if (!user) {
        throw new GraphQLError(
          context.i18next.t('common.errors.userNotLogged')
        );
      }
      const ability: AppAbility = extendAbilityForApplications(
        user,
        args.application
      );
      if (ability.cannot('update', 'Template')) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }

      const update = {
        $set: {
          'templates.$.name': args.template.name,
          'templates.$.content': args.template.content,
        },
      };

      const application = await Application.findOneAndUpdate(
        { _id: args.application, 'templates._id': args.id },
        update,
        { new: true }
      );

      return application.templates.find(
        (template) => template.id.toString() === args.id
      );
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
