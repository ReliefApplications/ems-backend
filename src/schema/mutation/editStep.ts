import mongoose from 'mongoose';
import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLString,
  GraphQLError,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { contentType } from '../../const/enumTypes';
import { StepType } from '../types';
import { Dashboard, Form, Step, Workflow } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import { canAccessContent } from '../../security/accessFromApplicationPermissions';
import { isArray } from 'lodash';

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

export default {
  /*  Finds a step from its id and update it, if user is authorized.
        Throws an error if not logged or authorized, or arguments are invalid.
    */
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
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }

    const ability: AppAbility = context.user.ability;
    if (
      !args ||
      (!args.name && !args.type && !args.content && !args.permissions)
    ) {
      throw new GraphQLError(
        context.i18next.t('errors.invalidEditStepArguments')
      );
    } else if (args.content) {
      let content = null;
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
        throw new GraphQLError(context.i18next.t('errors.dataNotFound'));
    }
    const update = {
      modifiedAt: new Date(),
    };
    Object.assign(
      update,
      args.name && { name: args.name },
      args.type && { type: args.type },
      args.content && { content: args.content }
    );

    const permissionsUpdate: any = {};
    // Updating permissions
    if (args.permissions) {
      const permissions: PermissionChange = args.permissions;
      for (const permission in permissions) {
        if (isArray(permissions[permission])) {
          // if it's an array, replace the old value with the provided list
          permissionsUpdate['permissions.' + permission] =
            permissions[permission];
        } else {
          const obj = permissions[permission];
          if (obj.add && obj.add.length) {
            const pushRoles = {
              [`permissions.${permission}`]: { $each: obj.add },
            };

            if (permissionsUpdate.$push)
              Object.assign(permissionsUpdate.$push, pushRoles);
            else Object.assign(permissionsUpdate, { $push: pushRoles });
          }
          if (obj.remove && obj.remove.length) {
            const pullRoles = {
              [`permissions.${permission}`]: {
                $in: obj.remove.map(
                  (role: any) => new mongoose.Types.ObjectId(role)
                ),
              },
            };

            if (permissionsUpdate.$pull)
              Object.assign(permissionsUpdate.$pull, pullRoles);
            else Object.assign(permissionsUpdate, { $pull: pullRoles });
          }
        }
      }
    }

    const filters = Step.accessibleBy(ability, 'update')
      .where({ _id: args.id })
      .getFilter();
    let step = await Step.findOneAndUpdate(
      filters,
      { ...update, ...permissionsUpdate },
      { new: true }
    );
    if (!step) {
      const workflow = await Workflow.findOne({ steps: args.id }, 'id');
      if (!workflow)
        throw new GraphQLError(context.i18next.t('errors.dataNotFound'));
      if (
        user.isAdmin &&
        (await canAccessContent(workflow.id, 'delete', ability))
      ) {
        step = await Step.findByIdAndUpdate(args.id, update, { new: true });
      } else {
        throw new GraphQLError(
          context.i18next.t('errors.permissionNotGranted')
        );
      }
    }
    if (step.type === contentType.dashboard) {
      // tslint:disable-next-line: no-shadowed-variable
      const dashboardUpdate = {
        modifiedAt: new Date(),
      };
      Object.assign(dashboardUpdate, args.name && { name: args.name });
      await Dashboard.findByIdAndUpdate(step.content, dashboardUpdate);
    }
    return step;
  },
};
