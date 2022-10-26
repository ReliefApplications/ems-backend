import errors from '../../const/errors';
import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import { Application } from '../../models';
import { TemplateType } from '../types';
import { AppAbility } from '../../security/defineAbilityFor';
import extendAbilityForApplications from '../../security/extendAbilityForApplication';

export default {
  type: TemplateType,
  args: {
    application: { type: new GraphQLNonNull(GraphQLID) },
    template: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(_, args, context) {
    const user = context.user;
    if (!user) {
      throw new GraphQLError(errors.userNotLogged);
    }
    const ability: AppAbility = extendAbilityForApplications(
      user,
      args.application
    );
    if (ability.cannot('update', 'Template')) {
      throw new GraphQLError(errors.permissionNotGranted);
    }

    const update = {
      $pull: { templates: { _id: args.template } },
    };

    const application = await Application.findByIdAndUpdate(
      args.application,
      update
    );

    return application.templates.find((x) => x.id.toString() === args.template);
  },
};
