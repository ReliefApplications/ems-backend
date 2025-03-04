import { contentType } from '@const/enumTypes';
import { Button, Dashboard, Form, Step } from '@models';
import ActionButtonInputType from '@schema/inputs/button-action.input';
import { graphQLAuthCheck } from '@schema/shared';
import extendAbilityForStep from '@security/extendAbilityForStep';
import { Context } from '@server/apollo/context';
import { logger } from '@services/logger.service';
import {
  GraphQLBoolean,
  GraphQLError,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { cloneDeep, has, isArray, isEmpty, omit } from 'lodash';
import { Types } from 'mongoose';
import { StepType } from '../types';

/** Simple form permission change type */
type SimplePermissionChange =
  | {
      add?: string[];
      remove?: string[];
    }
  | string[];

/** Type for the permission argument */
type PermissionChange = {
  canSee?: SimplePermissionChange;
  canUpdate?: SimplePermissionChange;
  canDelete?: SimplePermissionChange;
};

/** Arguments for the editStep mutation */
type EditStepArgs = {
  id: string | Types.ObjectId;
  name?: string;
  showName?: boolean;
  type?: string;
  content?: string | Types.ObjectId;
  permissions?: any;
  icon?: string;
  buttons?: Button[];
};

/**
 * Find a step from its id and update it, if user is authorized.
 * Throw an error if not logged or authorized, or arguments are invalid.
 */
export default {
  type: StepType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    name: { type: GraphQLString },
    showName: { type: GraphQLBoolean },
    icon: { type: GraphQLString },
    type: { type: GraphQLString },
    content: { type: GraphQLID },
    permissions: { type: GraphQLJSON },
    buttons: { type: new GraphQLList(ActionButtonInputType) },
  },
  async resolve(parent, args: EditStepArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      /**
       * Check if at least one of the required arguments is provided.
       * Else, send error.
       * This way, we check for the existence of keys, except id in args
       */
      if (isEmpty(cloneDeep(omit(args, ['id'])))) {
        throw new GraphQLError(
          context.i18next.t('mutations.step.edit.errors.invalidArguments')
        );
      }
      // get data and check permissions
      let step = await Step.findById(args.id);
      const ability = await extendAbilityForStep(user, step);
      if (ability.cannot('update', step)) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }
      // check the new content exists
      if (args.content) {
        let content: Form | Dashboard;
        switch (args.type) {
          case contentType.dashboard:
            content = await Dashboard.findById(args.content);
            break;
          case contentType.form:
            content = await Form.findById(args.content);
            break;
          default:
            break;
        }
        if (!content)
          throw new GraphQLError(
            context.i18next.t('common.errors.dataNotFound')
          );
      }

      // Create update
      const update = {
        ...(args.name && { name: args.name }),
        ...(args.icon && { icon: args.icon }),
        ...(args.type && { type: args.type }),
        ...(args.content && { content: args.content }),
        ...(has(args, 'showName') && { showName: args.showName }),
      } as any;
      // Update buttons
      if (args.buttons) {
        update.buttons = args.buttons;
      }
      // Updating permissions
      const permissionsUpdate: any = {};
      if (args.permissions) {
        const permissions: PermissionChange = args.permissions;
        for (const [key, obj] of Object.entries(permissions)) {
          if (isArray(obj)) {
            // if it's an array, replace the old value with the provided list
            permissionsUpdate['permissions.' + key] = obj;
          } else {
            if (obj.add && obj.add.length) {
              const pushRoles = {
                [`permissions.${key}`]: { $each: obj.add },
              };

              if (permissionsUpdate.$push)
                Object.assign(permissionsUpdate.$push, pushRoles);
              else Object.assign(permissionsUpdate, { $push: pushRoles });
            }
            if (obj.remove && obj.remove.length) {
              const pullRoles = {
                [`permissions.${key}`]: { $in: obj.remove },
              };

              if (permissionsUpdate.$pull)
                Object.assign(permissionsUpdate.$pull, pullRoles);
              else Object.assign(permissionsUpdate, { $pull: pullRoles });
            }
          }
        }
      }
      // update the step
      step = await Step.findByIdAndUpdate(
        args.id,
        { ...update, ...permissionsUpdate },
        { new: true }
      );
      // update the dashboard if needed
      if (step.type === contentType.dashboard) {
        const dashboardUpdate = {
          //modifiedAt: new Date(),
        };
        Object.assign(dashboardUpdate, args.name && { name: args.name });
        await Dashboard.findByIdAndUpdate(step.content, dashboardUpdate);
      }
      return step;
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
