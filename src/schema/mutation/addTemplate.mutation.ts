import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import { Application } from '@models';
import { TemplateType } from '../types';
import { AppAbility } from '@security/defineUserAbility';
import { TemplateInputType, TemplateArgs } from '../inputs/template.input';
import extendAbilityForApplications from '@security/extendAbilityForApplication';
import { logger } from '@lib/logger';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';

/** Arguments for the addTemplate mutation */
type AddTemplateArgs = {
  application: string;
  template: TemplateArgs;
};
/**
 * Mutation to add a new template.
 */
export default {
  type: TemplateType,
  args: {
    application: { type: new GraphQLNonNull(GraphQLID) },
    template: { type: new GraphQLNonNull(TemplateInputType) },
  },
  async resolve(_, args: AddTemplateArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
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
      if (err instanceof GraphQLError) {
        throw new GraphQLError(err.message);
      }
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
