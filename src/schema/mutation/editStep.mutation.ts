import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLString,
  GraphQLError,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { isArray } from 'lodash';
import { contentType } from '@const/enumTypes';
import { StepType } from '../types';
import { Dashboard, Form, Step } from '@models';
import extendAbilityForStep from '@security/extendAbilityForStep';

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

/**
 * Find a step from its id and update it, if user is authorized.
 * Throw an error if not logged or authorized, or arguments are invalid.
 */
export default {
  type: StepType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    name: { type: GraphQLString },
    type: { type: GraphQLString },
    content: { type: GraphQLID },
    permissions: { type: GraphQLJSON },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }
    // check inputs
    if (
      !args ||
      (!args.name && !args.type && !args.content && !args.permissions)
    ) {
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
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
    }

    // defining what to update
    const update = {
      //modifiedAt: new Date(),
    };
    Object.assign(
      update,
      args.name && { name: args.name },
      args.type && { type: args.type },
      args.content && { content: args.content }
    );

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
  },
};
