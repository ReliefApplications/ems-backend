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

/** Access form permission change type */
type AccessPermissionChange =
  | {
      add?: { role: string; access?: any }[];
      remove?: { role: string; access?: any }[];
      // update?: { [role: string]: { access: any } }[];
    }
  | { role: string; access?: any }[];

/** Type for the permission argument */
type PermissionChange = {
  canSee?: SimplePermissionChange;
  canUpdate?: SimplePermissionChange;
  canDelete?: SimplePermissionChange;
  canSeeRecords?: AccessPermissionChange;
  canUpdateRecords?: AccessPermissionChange;
  canDeleteRecords?: AccessPermissionChange;
  recordsUnicity?: AccessPermissionChange;
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
    const resource = await Resource.findById(args.id);
    if (ability.cannot('update', resource)) {
      throw new GraphQLError(context.i18next.t('errors.permissionNotGranted'));
    }

    // Create the update object
    const update: any = {
      modifiedAt: new Date(),
    };
    Object.assign(update, args.fields && { fields: args.fields });

    // Update permissions
    // const permBulkUpdate = [];
    if (args.permissions) {
      const permissions: PermissionChange = args.permissions;
      for (const permission in permissions) {
        if (isArray(permissions[permission])) {
          // if it's an array, replace the old value with the provided list
          update['permissions.' + permission] = permissions[permission];
        } else {
          const obj = permissions[permission];
          // if (obj.update) {
          //   const keys = Object.keys(obj.update);
          //   keys.forEach((key) => {
          //     permBulkUpdate.push({
          //       updateOne: {
          //         filter: {
          //           _id: resource._id,
          //           [`permissions.${permission}.role`]:
          //             new mongoose.Types.ObjectId(key),
          //         },
          //         update: {
          //           $set: {
          //             [`permissions.${permission}.$.access`]:
          //               obj.update[key].access,
          //           },
          //         },
          //       },
          //     });
          //   });
          // }
          if (obj.add && obj.add.length) {
            const pushRoles = {
              [`permissions.${permission}`]: { $each: obj.add },
            };

            if (update.$addToSet) Object.assign(update.$addToSet, pushRoles);
            else Object.assign(update, { $addToSet: pushRoles });
          }
          if (obj.remove && obj.remove.length) {
            let pullRoles: any;

            if (typeof obj.remove[0] === 'string') {
              // CanSee, canUpdate, canDelete
              pullRoles = {
                [`permissions.${permission}`]: {
                  $in: obj.remove.map(
                    (role: any) => new mongoose.Types.ObjectId(role)
                  ),
                },
              };
            } else {
              // canCreateRecords, canSeeRecords, canUpdateRecords, canDeleteRecords
              pullRoles = {
                [`permissions.${permission}`]: {
                  $in: obj.remove.map((perm: any) =>
                    perm.filter
                      ? {
                          role: new mongoose.Types.ObjectId(perm.role),
                          filter: perm.filter,
                        }
                      : {
                          role: new mongoose.Types.ObjectId(perm.role),
                        }
                  ),
                },
              };
            }

            if (update.$pull) Object.assign(update.$pull, pullRoles);
            else Object.assign(update, { $pull: pullRoles });
          }
        }
      }
    }

    return Resource.findByIdAndUpdate(
      args.id,
      update,
      { new: true },
      () => args.fields && buildTypes()
    );
  },
};
