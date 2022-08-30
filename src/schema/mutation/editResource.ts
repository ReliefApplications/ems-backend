import mongoose from 'mongoose';
import { GraphQLNonNull, GraphQLID, GraphQLList, GraphQLError } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { ResourceType } from '../types';
import { Resource } from '../../models';
import { buildTypes } from '../../utils/schema';
import { AppAbility } from '../../security/defineUserAbility';
import { isArray } from 'lodash';

/** Simple resource permission change type */
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

/** Simple resource field permission change type */
type SimpleFieldPermissionChange = {
  add?: { field: string; role: string };
  remove?: { field: string; role: string };
};

/** Type for the fieldPermission argument */
type FieldPermissionChange = {
  canSee?: SimpleFieldPermissionChange;
  canUpdate?: SimpleFieldPermissionChange;
};

/**
 * Edit an existing resource.
 * Throw GraphQL error if not logged or authorized.
 */
export default {
  type: ResourceType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    fields: { type: new GraphQLList(GraphQLJSON) },
    permissions: { type: GraphQLJSON },
    fieldsPermissions: { type: GraphQLJSON },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }
    if (
      !args ||
      (!args.fields && !args.permissions && !args.fieldsPermissions)
    ) {
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

    const allResourceFields = (await Resource.findById(args.id)).fields;

    const fieldsPermissionsUpdate: any = {};
    // Updating permissions
    if (args.fieldsPermissions) {
      const permissions: FieldPermissionChange = args.fieldsPermissions;
      for (const permission in permissions) {
        const obj = permissions[permission];
        console.log(JSON.stringify(obj));
        if (obj.add) {
          const fieldIndex = allResourceFields.findIndex(
            (r) => r.name === obj.add.field
          );
          if (fieldIndex === -1) continue;
          const pushRoles = {
            [`fields.${fieldIndex}.permissions.${permission}`]:
              new mongoose.Types.ObjectId(obj.add.role),
          };

          if (fieldsPermissionsUpdate.$addToSet)
            Object.assign(fieldsPermissionsUpdate.$addToSet, pushRoles);
          else Object.assign(fieldsPermissionsUpdate, { $addToSet: pushRoles });
        }
        if (obj.remove) {
          const fieldIndex = allResourceFields.findIndex(
            (r) => r.name === obj.remove.field
          );
          if (fieldIndex === -1) continue;
          const pullRoles = {
            [`fields.${fieldIndex}.permissions.${permission}`]:
              new mongoose.Types.ObjectId(obj.remove.role),
          };

          if (fieldsPermissionsUpdate.$pull)
            Object.assign(fieldsPermissionsUpdate.$pull, pullRoles);
          else Object.assign(fieldsPermissionsUpdate, { $pull: pullRoles });
        }
      }
    }

    const filters = Resource.accessibleBy(ability, 'update')
      .where({ _id: args.id })
      .getFilter();
    const resource = await Resource.findOneAndUpdate(
      filters,
      { ...update, ...permissionsUpdate, ...fieldsPermissionsUpdate },
      { new: true },
      () => args.fields && buildTypes()
    );
    if (!resource) {
      throw new GraphQLError(context.i18next.t('errors.permissionNotGranted'));
    }
    return resource;
  },
};
