import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import { Application } from '@models';
import { TemplateType } from '../types';
import { AppAbility } from '@security/defineUserAbility';
import extendAbilityForApplications from '@security/extendAbilityForApplication';

/**
 * Mutation to delete template.
 */
export default {
  type: TemplateType,
  args: {
    application: { type: new GraphQLNonNull(GraphQLID) },
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(_, args, context) {
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
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
      $pull: { templates: { _id: args.id } },
    };

    const application = await Application.findByIdAndUpdate(
      args.application,
      update
    );

    return application.templates.find((x) => x.id.toString() === args.id);
  },
};
