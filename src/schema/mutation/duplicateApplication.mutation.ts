import {
  GraphQLNonNull,
  GraphQLString,
  GraphQLError,
  GraphQLID,
} from 'graphql';
import { Application, Role, Channel, Resource } from '@models';
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

type ResourcePermission =
  | {
      role?: Types.ObjectId;
      access?: any;
    }
  | Types.ObjectId;

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
    // Authentication check
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
      // If no application, throw error
      if (!baseApplication) {
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      }
      // Check that user can create new applications
      if (ability.can('create', 'Application')) {
        // Check that a name was provided for the application
        if (args.name !== '') {
          const application = new Application({
            name: args.name,
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
          const roleMapping = {};
          for (const oldRole of roles) {
            const role = new Role({
              title: oldRole.title,
              description: oldRole.description,
              permissions: oldRole.permissions,
              channels: oldRole.channels,
              autoAssignment: oldRole.autoAssignment,
              application: application.id,
            });
            // make the connection between the original role and the new one
            roleMapping[oldRole._id] = role._id;
            await role.save();
          }

          // We need to update the resources permissions
          const allResources = await Resource.find();
          const resourcesToSave: Resource[] = [];
          const oldRoles = Object.keys(roleMapping).map((k) => k.toString());

          for (const resource of allResources) {
            let added = false;
            (
              [
                'canSee',
                'canUpdate',
                'canDelete',
                'canSeeRecords',
                'canCreateRecords',
                'canUpdateRecords',
                'canDeleteRecords',
              ] as const
            ).forEach((permType) => {
              const permissions = resource.permissions[permType] ?? [];
              const oldPermissions: ResourcePermission[] = permissions
                .filter((perm: ResourcePermission) => {
                  return !!(perm instanceof Types.ObjectId
                    ? oldRoles.includes(perm.toString())
                    : perm.role && oldRoles.includes(perm.role.toString()));
                })
                .map((x) => x._doc);

              if (!oldPermissions.length) {
                return;
              }

              const addedPermissions = oldPermissions.map((oldPermission) =>
                oldPermission instanceof Types.ObjectId
                  ? new Types.ObjectId(roleMapping[oldPermission.toString()])
                  : {
                      ...oldPermission,
                      role: new Types.ObjectId(
                        roleMapping[oldPermission.role.toString()]
                      ),
                    }
              );

              permissions.push(...addedPermissions);
              added = true;
              resource.markModified('permissions');
            });

            // Do the same for the fields permissions
            (resource.fields ?? []).forEach((field) => {
              if (!field.permissions) {
                return;
              }

              (['canSee', 'canUpdate'] as const).forEach((permType) => {
                const fieldPermissions: Types.ObjectId[] =
                  field.permissions[permType] ?? [];

                // Get the old roles that are in the permissions of the field
                const newPermissions = oldRoles
                  .filter((oldRole) =>
                    fieldPermissions.find((perm) => perm.equals(oldRole))
                  )
                  .map((role) => new Types.ObjectId(roleMapping[role]));
                if (!newPermissions) {
                  return;
                }

                // Add the new permissions to the field
                field.permissions[permType].push(...newPermissions);
                added = true;
                resource.markModified('fields');
              });
            });
            if (added) {
              resourcesToSave.push(resource);
            }
          }

          await Resource.bulkSave(resourcesToSave);

          const copiedPages = await duplicatePages(
            baseApplication,
            roleMapping
          );

          if (copiedPages) {
            application.pages = copiedPages;
          }

          await application.save();
          return application;
        } else {
          // Else, throw error
          throw new GraphQLError(
            context.i18next.t(
              'mutations.application.duplicate.errors.invalidArguments'
            )
          );
        }
      } else {
        // Else, throw error
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
