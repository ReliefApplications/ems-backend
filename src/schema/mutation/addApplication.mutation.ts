import { GraphQLError } from 'graphql';
import channels from '@const/channels';
import { Application, Role, Notification, Channel } from '@models';
import pubsub from '../../server/pubsub';
import { ApplicationType } from '../types';
import { AppAbility } from '@security/defineUserAbility';
import { status } from '@const/enumTypes';
import permissions from '@const/permissions';
import { logger } from '@lib/logger';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';

/** Arguments for the addApplication mutation */
// eslint-disable-next-line @typescript-eslint/ban-types
type AddApplicationArgs = {};

/**
 * Create a new application.
 * Throw an error if not logged or authorized, or arguments are invalid.
 */
export default {
  type: ApplicationType,
  args: {},
  async resolve(parent, args: AddApplicationArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      const ability: AppAbility = user.ability;
      if (ability.can('create', 'Application')) {
        // Find suitable application name
        let appName = '';
        try {
          const existingUntitledApps = await Application.find({
            name: { $regex: new RegExp(/^(Untitled application (\d+))$/) },
          }).select('name');

          // Get only the number from the app name to allow using the Math.max() function
          const formattedAppsNumbers = existingUntitledApps.map((app) => {
            return parseInt(app.name.replace('Untitled application ', ''), 10);
          });

          // If there is no previous app, set to 0. Else, set to the maximal value + 1
          const nextAppNameNumber = formattedAppsNumbers.length
            ? Math.max(...formattedAppsNumbers) + 1
            : 0;

          appName = `Untitled application ${nextAppNameNumber}`;
        } catch {
          appName = 'Untitled application 0';
        }
        const application = new Application({
          name: appName,
          status: status.pending,
          createdBy: user._id,
          permissions: {
            canSee: [],
            canUpdate: [],
            canDelete: [],
          },
        });
        if (ability.cannot('manage', 'Application')) {
          const firstAdminRole = user.roles.find(
            (x) =>
              !x.application &&
              x.permissions.some(
                (y) => y.type === permissions.canCreateApplications
              )
          )?.id;
          application.permissions = {
            canSee: [firstAdminRole],
            canUpdate: [firstAdminRole],
            canDelete: [firstAdminRole],
          };
        }
        await application.save();
        // Send notification
        const channel = await Channel.findOne({ title: channels.applications });
        const notification = new Notification({
          action: 'Application created',
          content: application,
          channel: channel.id,
          seenBy: [],
        });
        await notification.save();
        const publisher = await pubsub();
        publisher.publish(channel.id, { notification });
        // Create main channel
        const mainChannel = new Channel({
          title: 'main',
          application: application._id,
        });
        await mainChannel.save();
        // Create roles
        for (const name of ['Editor', 'Manager', 'Guest']) {
          const role = new Role({
            title: name,
            application: application.id,
            channels: [mainChannel._id],
          });
          await role.save();
          application.permissions.canSee.push(role._id);
        }
        return application;
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
