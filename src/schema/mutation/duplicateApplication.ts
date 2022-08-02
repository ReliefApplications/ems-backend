import {
  GraphQLNonNull,
  GraphQLString,
  GraphQLError,
  GraphQLID,
} from 'graphql';
import { Application, Role, Channel } from '../../models';
import { validateName } from '../../utils/validators';
import { ApplicationType } from '../types';
import { duplicatePages } from '../../services/page.service';
import { AppAbility } from '../../security/defineUserAbilities';
import { status } from '../../const/enumTypes';

export default {
  /*  Creates a new application from a given id
        Throws an error if not logged or authorized, or arguments are invalid.
    */
  type: ApplicationType,
  args: {
    name: { type: new GraphQLNonNull(GraphQLString) },
    application: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }

    const ability: AppAbility = context.user.ability;
    validateName(args.name);
    if (ability.can('create', 'Application')) {
      const baseApplication = await Application.findById(args.application);
      const copiedPages = await duplicatePages(baseApplication);
      if (!baseApplication)
        throw new GraphQLError(context.i18next.t('errors.dataNotFound'));
      if (args.name !== '') {
        const application = new Application({
          name: args.name,
          createdAt: new Date(),
          status: status.pending,
          createdBy: user.id,
          pages: copiedPages,
          permissions: {
            canSee: baseApplication.permissions.canSee,
            canUpdate: baseApplication.permissions.canUpdate,
            canDelete: baseApplication.permissions.canDelete,
          },
        });
        await application.save();

        // Copy Channels
        const appChannels = await Channel.find({
          application: baseApplication.id,
        });
        await Promise.all(
          appChannels.map(async (c) => {
            const tempChannel = new Channel({
              title: c.title,
              application: application._id,
            });
            await tempChannel.save();
            return c;
          })
        );

        // Create roles
        const roles = await Role.find({ application: baseApplication._id });
        for (const name of roles) {
          const role = new Role({
            title: name.title,
            application: application.id,
            channels: name.channels,
          });
          await role.save();
        }
        return application;
      }
      throw new GraphQLError(
        context.i18next.t('errors.invalidAddApplicationArguments')
      );
    } else {
      throw new GraphQLError(context.i18next.t('errors.permissionNotGranted'));
    }
  },
};
