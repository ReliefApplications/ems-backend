import mongoose from 'mongoose';
import { GraphQLNonNull, GraphQLID, GraphQLList, GraphQLError } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { ResourceType } from '../types';
import { findDuplicateFields } from '@utils/form';
import {
  getExpressionFromString,
  OperationTypeMap,
} from '@utils/aggregation/expressionFromString';
import { Resource } from '@models';
import { buildTypes } from '@utils/schema';
import { AppAbility } from '@security/defineUserAbility';
import { get, isArray } from 'lodash';

/** Simple resource permission change type */
type SimplePermissionChange =
  | {
      add?: string[];
      remove?: string[];
    }
  | string[];

/** Access resource permission change type */
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

/** Type for the calculated field argument */
type CalculatedFieldChange = {
  add?: { name: string; expression: string };
  remove?: { name: string };
  update?: { oldName: string; name: string; expression: string };
};

/**
 * Add field permission
 *
 * @param update update document
 * @param fields list of fields of resource
 * @param fieldName field name
 * @param role role to add permission to
 * @param permission permission to add
 */
const addFieldPermission = (
  update: any,
  fields: any[],
  fieldName: string,
  role: string,
  permission: string
) => {
  const fieldIndex = fields.findIndex((r) => r.name === fieldName);
  if (fieldIndex === -1) return;
  const pushRoles = {
    [`fields.${fieldIndex}.permissions.${permission}`]:
      new mongoose.Types.ObjectId(role),
  };

  if (update.$addToSet) Object.assign(update.$addToSet, pushRoles);
  else Object.assign(update, { $addToSet: pushRoles });
};

/**
 * Remove field permission
 *
 * @param update update document
 * @param fields list of fields of resource
 * @param fieldName field name
 * @param role role to remove permission for
 * @param permission permission to remove
 */
const removeFieldPermission = (
  update: any,
  fields: any[],
  fieldName: string,
  role: string,
  permission: string
) => {
  const fieldIndex = fields.findIndex((r) => r.name === fieldName);
  if (fieldIndex === -1) return;
  const pullRoles = {
    [`fields.${fieldIndex}.permissions.${permission}`]:
      new mongoose.Types.ObjectId(role),
  };

  if (update.$pull) Object.assign(update.$pull, pullRoles);
  else Object.assign(update, { $pull: pullRoles });
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
    calculatedField: { type: GraphQLJSON },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }
    if (
      !args ||
      (!args.fields &&
        !args.permissions &&
        !args.calculatedField &&
        !args.fieldsPermissions)
    ) {
      throw new GraphQLError(
        context.i18next.t('mutations.resource.edit.errors.invalidArguments')
      );
    }

    // check ability
    const ability: AppAbility = user.ability;
    const resource = await Resource.findById(args.id);
    if (ability.cannot('update', resource)) {
      throw new GraphQLError(
        context.i18next.t('common.errors.permissionNotGranted')
      );
    }

    // Create the update object
    const update: any = {
      modifiedAt: new Date(),
    };
    // Tell if it is required to build types
    let updateGraphQL = (args.fields && true) || false;
    Object.assign(update, args.fields && { fields: args.fields });

    const allResourceFields = (await Resource.findById(args.id)).fields;

    // Update permissions
    if (args.permissions) {
      const permissions: PermissionChange = args.permissions;
      for (const permission in permissions) {
        if (isArray(permissions[permission])) {
          // if it's an array, replace the old value with the provided list
          update['permissions.' + permission] = permissions[permission];
        } else {
          const obj = permissions[permission];
          if (obj.add && obj.add.length) {
            const pushRoles = {
              [`permissions.${permission}`]: { $each: obj.add },
            };

            if (update.$addToSet) Object.assign(update.$addToSet, pushRoles);
            else Object.assign(update, { $addToSet: pushRoles });

            // Add permission for all fields, if role does not have any other access
            obj.add.forEach((x) => {
              if (
                x.role &&
                !x.access &&
                ['canUpdateRecords', 'canSeeRecords'].includes(permission) &&
                !get(resource, `permissions.${permission}`).find(
                  (p) => p.role.equals(x.role) && p.access
                )
              ) {
                allResourceFields
                  .map((f) => f.name)
                  .forEach((f) =>
                    addFieldPermission(
                      update,
                      allResourceFields,
                      f,
                      x.role,
                      permission === 'canUpdateRecords' ? 'canUpdate' : 'canSee'
                    )
                  );
              }
            });
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
                    perm.access
                      ? {
                          role: new mongoose.Types.ObjectId(perm.role),
                          access: perm.access,
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

            // Remove permission for all fields, if role does not have any other access
            obj.remove.forEach((x) => {
              if (
                x.role &&
                !x.access &&
                ['canUpdateRecords', 'canSeeRecords'].includes(permission) &&
                !get(resource, `permissions.${permission}`).find(
                  (p) => p.role.equals(x.role) && p.access
                )
              ) {
                allResourceFields
                  .map((f) => f.name)
                  .forEach((f) =>
                    removeFieldPermission(
                      update,
                      allResourceFields,
                      f,
                      x.role,
                      permission === 'canUpdateRecords' ? 'canUpdate' : 'canSee'
                    )
                  );
              }
            });
          }
        }
      }
    }

    // Updating field permissions
    if (args.fieldsPermissions) {
      const permissions: FieldPermissionChange = args.fieldsPermissions;
      for (const permission in permissions) {
        const obj = permissions[permission];
        if (obj.add) {
          addFieldPermission(
            update,
            allResourceFields,
            obj.add.field,
            obj.add.role,
            permission
          );
        }
        if (obj.remove) {
          removeFieldPermission(
            update,
            allResourceFields,
            obj.remove.field,
            obj.remove.role,
            permission
          );
        }
      }
    }

    const arrayFilters: any[] = [];
    // Update calculated fields
    if (args.calculatedField) {
      const calculatedField: CalculatedFieldChange = args.calculatedField;
      // Add new calculated field
      if (calculatedField.add) {
        const expression = getExpressionFromString(
          calculatedField.add.expression
        );
        const pushCalculatedField = {
          fields: {
            isCalculated: true,
            name: calculatedField.add.name,
            expression: calculatedField.add.expression,
            type: OperationTypeMap[expression.operation] ?? 'text',
          },
        };

        findDuplicateFields([
          ...allResourceFields,
          { name: calculatedField.add.name },
        ]);

        if (update.$addToSet)
          Object.assign(update.$addToSet, pushCalculatedField);
        else Object.assign(update, { $addToSet: pushCalculatedField });
      }
      // Remove existing field
      if (calculatedField.remove) {
        const pullCalculatedField = {
          fields: {
            name: calculatedField.remove.name,
          },
        };

        if (update.$pull) Object.assign(update.$pull, pullCalculatedField);
        else Object.assign(update, { $pull: pullCalculatedField });
      }
      // Update existing field
      if (calculatedField.update) {
        const expression = getExpressionFromString(
          calculatedField.update.expression
        );
        const updateCalculatedFields = {
          'fields.$[element].expression': calculatedField.update.expression,
          'fields.$[element].type':
            OperationTypeMap[expression.operation] ?? 'text',
          'fields.$[element].name': calculatedField.update.name,
        };

        // if old name is different than new name, test duplication
        if (calculatedField.update.name !== calculatedField.update.oldName) {
          allResourceFields.push({
            name: calculatedField.update.name,
          });
        }

        if (update.$set) Object.assign(update.$set, updateCalculatedFields);
        else Object.assign(update, { $set: updateCalculatedFields });
        arrayFilters.push({ 'element.name': calculatedField.update.oldName });
      }
      updateGraphQL = true;
    }

    return Resource.findByIdAndUpdate(
      args.id,
      update,
      { new: true, arrayFilters },
      () => updateGraphQL && buildTypes()
    );
  },
};
