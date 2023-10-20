import {
  GraphQLNonNull,
  GraphQLString,
  GraphQLError,
  GraphQLID,
} from 'graphql';
import { Application, Role, Channel } from '@models';
import { ApplicationType } from '../types';
import { duplicatePages } from '../../services/page.service';
import { AppAbility } from '@security/defineUserAbility';
import { status } from '@const/enumTypes';
import { copyFolder } from '@utils/files/copyFolder';
import { logger } from '@services/logger.service';
import { graphQLAuthCheck } from '@schema/shared';
import { accessibleBy } from '@casl/mongoose';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

/** Arguments for the duplicateApplication mutation */
type DuplicateApplicationArgs = {
  name: string;
  application: string | Types.ObjectId;
};

/**
 * Create a new application from a given id.
 * Throw an error if not logged or authorized, or arguments are invalid.
 */
export default {
  type: ApplicationType,
  args: {
    name: { type: new GraphQLNonNull(GraphQLString) },
    application: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args: DuplicateApplicationArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      const ability: AppAbility = context.user.ability;
      const filters = Application.find(
        accessibleBy(ability, 'read').Application
      )
        .where({ _id: args.application })
        .getFilter();
      const baseApplication = await Application.findById(filters);
      if (baseApplication && ability.can('create', 'Application')) {
        if (!baseApplication)
          throw new GraphQLError(
            context.i18next.t('common.errors.dataNotFound')
          );
        if (args.name !== '') {
          const application = new Application({
            name: args.name,
            //createdAt: new Date(),
            status: status.pending,
            createdBy: user._id,
            permissions: {
              canSee: baseApplication.permissions.canSee,
              canUpdate: baseApplication.permissions.canUpdate,
              canDelete: baseApplication.permissions.canDelete,
            },
          });
          // Copy files from base application
          await copyFolder('applications', baseApplication.id, application.id);
          if (baseApplication.cssFilename) {
            application.cssFilename = baseApplication.cssFilename.replace(
              baseApplication.id,
              application.id
            );
          }
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
          const newPermissions = {};
          for (const name of roles) {
            const role = new Role({
              title: name.title,
              application: application.id,
              channels: name.channels,
            });
            // make the conection betwen the original role and the new one
            newPermissions[name._id] = role._id;
            await role.save();
          }
          const copiedPages = await duplicatePages(
            baseApplication,
            newPermissions
          );
          const update = {};
          Object.assign(update, copiedPages && { pages: copiedPages });

          const newapplication = await Application.findOneAndUpdate(
            { _id: application._id },
            update,
            {
              new: true,
            }
          );

          return newapplication;
        }
        throw new GraphQLError(
          context.i18next.t(
            'mutations.application.duplicate.errors.invalidArguments'
          )
        );
      } else {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
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
