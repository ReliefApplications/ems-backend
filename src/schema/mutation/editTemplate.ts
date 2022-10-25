import errors from '../../const/errors';
import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import { Application } from '../../models';
import { TemplateType } from '../types';
import { AppAbility } from '../../security/defineAbilityFor';
import TemplateInputType from '../inputs/template.input';

export default {
  type: TemplateType,
  args: {
    application: { type: new GraphQLNonNull(GraphQLID) },
    template: { type: new GraphQLNonNull(TemplateInputType) },
  },
  async resolve(_, args, context) {
    const user = context.user;
    if (!user) {
      throw new GraphQLError(errors.userNotLogged);
    }
    const ability: AppAbility = user.ability;
    if (ability.cannot('update', 'Template')) {
      throw new GraphQLError(errors.permissionNotGranted);
    }

    if (!args.template.id) {
      throw new GraphQLError(errors.invalidEditTemplateArguments);
    }

    const update = {
      $set: {
        'templates.$.name': args.template.name,
        'templates.$.content': args.template.content,
      },
    };

    const application = await Application.findOneAndUpdate(
      { _id: args.application, 'templates._id': args.template.id },
      update,
      { new: true }
    );

    return application.templates.find(
      (template) => template.id.toString() === args.template.id
    );
  },
};
