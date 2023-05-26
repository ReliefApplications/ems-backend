import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import { Application } from '@models';
import { TemplateType } from '../types';
import { AppAbility } from '@security/defineUserAbility';
import TemplateInputType from '../inputs/template.input';
import extendAbilityForApplications from '@security/extendAbilityForApplication';
import { logger } from '@services/logger.service';
import { userNotLogged } from '@utils/schema';

/**
 * Mutation to add a new template.
 */
export default {
  type: TemplateType,
  args: {
    application: { type: new GraphQLNonNull(GraphQLID) },
    template: { type: new GraphQLNonNull(TemplateInputType) },
  },
  async resolve(_, args, context) {
    const user = context.user;
    userNotLogged(user);
    try {
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
        $addToSet: {
          templates: {
            name: args.template.name,
            type: args.template.type,
            content: args.template.content,
          },
        },
      };

      const application = await Application.findByIdAndUpdate(
        args.application,
        update,
        { new: true }
      );

      return application.templates.pop();
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
