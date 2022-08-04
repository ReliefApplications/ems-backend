import mongoose from 'mongoose';
import { GraphQLNonNull, GraphQLID, GraphQLList, GraphQLError } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { ResourceType } from '../types';
import { Resource } from '../../models';
import { buildTypes } from '../../utils/schema';
import { AppAbility } from '../../security/defineUserAbility';
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
  /*  Edits an existing resource.
        Throws GraphQL error if not logged or authorized.
    */
  type: ResourceType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    fields: { type: new GraphQLList(GraphQLJSON) },
    permissions: { type: GraphQLJSON },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }
    if (!args || (!args.fields && !args.permissions)) {
      throw new GraphQLError(
        context.i18next.t('errors.invalidEditResourceArguments')
      );
    }

    // check ability
    const ability: AppAbility = user.ability;

    // Create the update object
    const update = {};
    Object.assign(update, args.fields && { fields: args.fields });

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
    const resource = await Resource.accessibleBy(
      ability,
      'update'
    ).findOneAndUpdate(
      { _id: args.id },
      { ...update, ...permissionsUpdate },
      { new: true },
      () => args.fields && buildTypes()
    );
    if (!resource) {
      throw new GraphQLError(context.i18next.t('errors.permissionNotGranted'));
    }
    return resource;
  },
};
