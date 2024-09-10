import {
  GraphQLNonNull,
  GraphQLString,
  GraphQLError,
  GraphQLID,
} from 'graphql';
import {
  Application,
  Role,
  Channel,
  Resource,
  DistributionList,
  Template,
  Dashboard,
  PositionAttributeCategory,
  CustomNotification,
  Page,
} from '@models';
import { ApplicationType } from '../types';
import { duplicatePages } from '../../services/page.service';
import { AppAbility } from '@security/defineUserAbility';
import { status } from '@const/enumTypes';
import { copyFolder } from '@utils/files/copyFolder';
import { logger } from '@lib/logger';
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
          //  check if name is unique
          const applicationWithName = await Application.findOne({
            name: args.name,
          });
          if (applicationWithName) {
            throw new GraphQLError(
              context.i18next.t(
                'mutations.application.duplicate.errors.namedDuplicated',
                { name: args.name }
              )
            );
          }
          // Copy application, and its permissions
          const application = new Application({
            name: args.name,
            description: baseApplication.description,
            sideMenu: baseApplication.sideMenu,
            hideMenu: baseApplication.hideMenu,
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
          // Make sure the new application uses the correct css file
          if (baseApplication.cssFilename) {
            application.cssFilename = baseApplication.cssFilename.replace(
              baseApplication.id,
              application.id
            );
          }

          // Ids to be replaced in widget settings (ids from distribution lists, templates and pages)
          const idsToReplace: Record<string, string> = {
            [baseApplication.id.toString()]: application.id.toString(),
          };

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
              idsToReplace[c._id.toString()] = tempChannel._id.toString();
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
                    fieldPermissions.find((perm) =>
                      typeof perm === 'string'
                        ? perm === oldRole
                        : perm.equals(oldRole)
                    )
                  )
                  .map((role) => new Types.ObjectId(roleMapping[role]));
                if (!newPermissions) {
                  return;
                }

                // Add the new permissions to the field
                if (field.permissions[permType]) {
                  field.permissions[permType].push(...newPermissions);
                  added = true;
                  resource.markModified('fields');
                }
              });
            });
            if (added) {
              resourcesToSave.push(resource);
            }
          }
          await Resource.bulkSave(resourcesToSave);

          // Duplicate distribution lists
          const newDistLists: DistributionList[] = [];
          const oldDistLists = baseApplication.distributionLists;
          for (const oldDistList of oldDistLists) {
            const distList = {
              name: oldDistList.name,
              emails: oldDistList.emails,
            };
            newDistLists.push(distList as DistributionList);
          }

          // Duplicate email templates
          const newTemplates: Template[] = [];
          const oldTemplates = baseApplication.templates;
          for (const oldTemplate of oldTemplates) {
            const template = {
              name: oldTemplate.name,
              type: oldTemplate.type,
              content: oldTemplate.content,
            };
            newTemplates.push(template as Template);
          }
          // Add distribution lists & templates to application
          application.distributionLists = newDistLists;
          application.templates = newTemplates;

          // We need to save the application to get the ids of the new distribution lists and templates
          await application.save();

          // Add the new ids to the map
          oldDistLists.forEach((_, index) => {
            idsToReplace[oldDistLists[index]._id.toString()] =
              application.distributionLists[index]._id.toString();
          });
          oldTemplates.forEach((_, index) => {
            idsToReplace[oldTemplates[index]._id.toString()] =
              application.templates[index]._id.toString();
          });

          // Duplicate the subscriptions
          const newSubscriptions: typeof application.subscriptions = [];
          const oldSubscriptions = baseApplication.subscriptions;
          for (const oldSubscription of oldSubscriptions) {
            // Update the routing key to the new ids
            const newRoutingKey = oldSubscription.routingKey.replace(
              /(\w+\.)?(\w{24})\.(\w{24})/g,
              (match, p1, p2, p3) => {
                const newApp = idsToReplace[p2];
                const newChannel = idsToReplace[p3];

                if (newApp && newChannel) {
                  return `${p1}${newApp}.${newChannel}`;
                }
                return match;
              }
            );
            const subscription = {
              routingKey: newRoutingKey,
              title: oldSubscription.title,
              convertTo: oldSubscription.convertTo,
              channel:
                idsToReplace[oldSubscription.channel.toString()] ??
                oldSubscription.channel,
            };
            newSubscriptions.push(subscription);
          }

          // Duplicate custom notifications
          const newCustomNotifications: CustomNotification[] = [];
          const oldCustomNotifications = baseApplication.customNotifications;
          for (const oldCustomNotification of oldCustomNotifications) {
            // We change the template id to the one that was just created
            const newTemplate = new Types.ObjectId(
              idsToReplace[oldCustomNotification.template.toString()]
            );
            // We change the recipients to the new distribution list, if it uses it
            const newRecipients =
              oldCustomNotification.recipientsType === 'distributionList'
                ? new Types.ObjectId(
                    idsToReplace[oldCustomNotification.recipients.toString()]
                  )
                : oldCustomNotification.recipients;

            const customNotification = {
              name: oldCustomNotification.name,
              description: oldCustomNotification.description,
              schedule: oldCustomNotification.schedule,
              notificationType: oldCustomNotification.notificationType,
              resource: oldCustomNotification.resource,
              layout: oldCustomNotification.layout,
              template: newTemplate,
              recipients: newRecipients,
              recipientsType: oldCustomNotification.recipientsType,
              status: oldCustomNotification.status,
              lastExecutionStatus: 'pending',
            };
            newCustomNotifications.push(
              customNotification as CustomNotification
            );
          }

          // Add notifications & subscriptions to the application
          application.customNotifications = newCustomNotifications;
          application.subscriptions = newSubscriptions;

          // Duplicate pages
          const copiedPages = await duplicatePages(
            baseApplication,
            roleMapping
          );

          if (copiedPages) {
            application.pages = copiedPages;
          }

          // Add pages to the map
          baseApplication.pages.forEach((p, index) => {
            if (baseApplication.pages[index] && application.pages[index]) {
              idsToReplace[baseApplication.pages[index].toString()] =
                application.pages[index].toString();
            }
          });

          // Populate pages to get the newly created dashboards
          await application.populate({
            path: 'pages',
            model: 'Page',
            select: 'type content',
          });

          // We also need to populate the content of the old pages
          await baseApplication.populate({
            path: 'pages',
            model: 'Page',
            select: 'content',
          });

          // We also add the content of the pages to the map
          application.pages.forEach((p: Page, i) => {
            const oldContentId = (baseApplication.pages[i] as Page)
              .content as Types.ObjectId;
            idsToReplace[oldContentId.toString()] = p.content.toString();
          });

          const newDashboards = await Dashboard.find({
            _id: {
              $in: application.pages
                .filter((x: any) => x.type === 'dashboard')
                .map((x: any) => x.content),
            },
          });

          // Update the structure of the dashboards
          newDashboards.forEach((dashboard) => {
            const stringified = JSON.stringify(dashboard.structure || {});
            const replaced = stringified.replace(
              /(["(/])([a-f\d]{24})([")/])/g,
              (_, prefix, id, suffix) => {
                if (idsToReplace[id]) {
                  return `${prefix}${idsToReplace[id]}${suffix}`;
                }
                return `${prefix}${id}${suffix}`;
              }
            );
            dashboard.structure = JSON.parse(replaced);
            dashboard.markModified('structure');
          });

          // Save the dashboards
          await Dashboard.bulkSave(newDashboards);

          // Copy the position attributes
          const oldAttributes = await PositionAttributeCategory.find({
            application: baseApplication._id,
          });

          const newAttributes = oldAttributes.map((oldAttribute) => {
            const attribute = new PositionAttributeCategory({
              title: oldAttribute.title,
              application: application._id,
            });
            return attribute;
          });

          await PositionAttributeCategory.bulkSave(newAttributes);

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
