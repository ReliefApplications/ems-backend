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
import { get, has, isArray } from 'lodash';

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
 * Check field permission
 *
 * @param context graphql context
 * @param resourcePermissions resource permissions
 * @param fields resource fields
 * @param fieldName field name
 * @param role current role to edit permissions of
 * @param permission field permission to add
 */
const checkFieldPermission = (
  context: any,
  resourcePermissions: any,
  fields: any[],
  fieldName: string,
  role: string,
  permission: string
) => {
  const field = fields.find((r) => r.name === fieldName);
  if (!field) {
    throw new GraphQLError(
      context.i18next.t('mutations.resource.edit.errors.field.notFound')
    );
  }
  switch (permission) {
    case 'canSee': {
      if (
        !get(resourcePermissions, 'canSeeRecords', []).find((p) =>
          p.role.equals(role)
        ) &&
        !get(resourcePermissions, 'canCreateRecords', []).find((p) =>
          p.role.equals(role)
        )
      ) {
        throw new GraphQLError(
          context.i18next.t(
            'mutations.resource.edit.errors.field.missingReadPermissionOnResource'
          )
        );
      }
      break;
    }
    case 'canUpdate': {
      if (
        !get(resourcePermissions, 'canCreateRecords', []).find((p) =>
          p.role.equals(role)
        ) &&
        !get(resourcePermissions, 'canUpdateRecords', []).find((p) =>
          p.role.equals(role)
        )
      ) {
        throw new GraphQLError(
          context.i18next.t(
            'mutations.resource.edit.errors.field.missingWritePermissionOnResource'
          )
        );
      }
      if (!get(field, 'permissions.canSee', []).find((p) => p.equals(role))) {
        throw new GraphQLError(
          context.i18next.t('mutations.resource.edit.errors.field.notVisible')
        );
      }
      break;
    }
    default: {
      break;
    }
  }
};

/**
 * Add resource permission
 *
 * @param update update document
 * @param add addition rules
 * @param permission permission to add
 */
const addResourcePermission = (update: any, add: any, permission: string) => {
  const pushRoles = {
    [`permissions.${permission}`]: { $each: add },
  };

  if (update.$addToSet) Object.assign(update.$addToSet, pushRoles);
  else Object.assign(update, { $addToSet: pushRoles });
};

/**
 * Check that the permissions are well combined.
 * Throw an error if not the case.
 *
 * @param context graphql context
 * @param resourcePermissions current resource permissions
 * @param change current permission change
 * @param change.role role to add permission to
 * @param change.access filter to match in order to apply permission
 * @param permission permission to edit
 */
const checkPermission = (
  context,
  resourcePermissions: any,
  change: { role: string; access?: any },
  permission: string
) => {
  switch (permission) {
    case 'canUpdateRecords': {
      if (
        !get(resourcePermissions, 'canSeeRecords', []).find((p) =>
          p.role.equals(change.role)
        )
      ) {
        throw new GraphQLError(
          context.i18next.t(
            'mutations.resource.edit.errors.permission.notVisible'
          )
        );
      }
      break;
    }
  }
};

/**
 * Apply common sense rules on fields.
 * If user can edit or create new records, it should be able to edit the fields
 * If user can see records, it should be able to see the fields
 *
 * @param update update document
 * @param resourcePermissions current resource permissions
 * @param resourceFields current resource fields
 * @param change current permission change
 * @param change.role role to add permission to
 * @param change.access filter to match in order to apply permission
 * @param permission permission to edit
 */
const automateFieldsPermission = (
  update: any,
  resourcePermissions: any,
  resourceFields: any[],
  change: { role: string; access?: any },
  permission: string
) => {
  switch (permission) {
    case 'canUpdateRecords': {
      // Make sure that user does not have any write permission on resource
      if (
        !get(resourcePermissions, 'canUpdateRecords', []).find((p) =>
          p.role.equals(change.role)
        ) &&
        !get(resourcePermissions, 'canCreateRecords', []).find((p) =>
          p.role.equals(change.role)
        )
      ) {
        // Add update permission to all fields.
        resourceFields
          .map((f) => f.name)
          .forEach((f) =>
            addFieldPermission(
              update,
              resourceFields,
              f,
              change.role,
              'canUpdate'
            )
          );
      }
      break;
    }
    case 'canCreateRecords': {
      // Make sure that user does not have any write permission on resource
      if (
        !get(resourcePermissions, 'canUpdateRecords', []).find((p) =>
          p.role.equals(change.role)
        ) &&
        !get(resourcePermissions, 'canCreateRecords', []).find((p) =>
          p.role.equals(change.role)
        )
      ) {
        // Add update permission to all fields.
        resourceFields
          .map((f) => f.name)
          .forEach((f) =>
            addFieldPermission(
              update,
              resourceFields,
              f,
              change.role,
              'canUpdate'
            )
          );
      }
      // Make sure that user does not have any read permission on resource
      if (
        !get(resourcePermissions, 'canSeeRecords', []).find((p) =>
          p.role.equals(change.role)
        ) &&
        !get(resourcePermissions, 'canCreateRecords', []).find((p) =>
          p.role.equals(change.role)
        )
      ) {
        // Add update permission to all fields.
        resourceFields
          .map((f) => f.name)
          .forEach((f) =>
            addFieldPermission(update, resourceFields, f, change.role, 'canSee')
          );
      }
      break;
    }
    case 'canSeeRecords': {
      // Make sure that user does not have any see permission on resource
      if (
        !get(resourcePermissions, 'canSeeRecords', []).find((p) =>
          p.role.equals(change.role)
        ) &&
        !get(resourcePermissions, 'canCreateRecords', []).find((p) =>
          p.role.equals(change.role)
        )
      ) {
        // Add see permission to all fields.
        resourceFields
          .map((f) => f.name)
          .forEach((f) =>
            addFieldPermission(update, resourceFields, f, change.role, 'canSee')
          );
      }
      break;
    }
    default: {
      break;
    }
  }
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
 * Remove resource permission
 *
 * @param update update document
 * @param remove remove rules ( array of string or array of role / access)
 * @param permission permission to remove
 */
const removeResourcePermission = (
  update: any,
  remove: any,
  permission: string
) => {
  let pullRoles: any;

  if (typeof remove[0] === 'string') {
    // CanSee, canUpdate, canDelete
    pullRoles = {
      [`permissions.${permission}`]: {
        $in: remove.map((role: any) => new mongoose.Types.ObjectId(role)),
      },
    };
  } else {
    // canCreateRecords, canSeeRecords, canUpdateRecords, canDeleteRecords
    pullRoles = {
      [`permissions.${permission}`]: {
        $in: remove.map((perm: any) =>
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
};

/**
 * Apply common sense rules on fields.
 * If user cannot edit nor create new records, it should be not able to edit the fields
 * If user cannot see records, it should not be able to see the fields
 *
 * @param update update document
 * @param resourcePermissions current resource permissions
 * @param resourceFields current resource fields
 * @param change current permission change
 * @param change.role role to add permission to
 * @param change.access filter to match in order to apply permission
 * @param permission permission to edit
 */
const clearFieldsPermission = (
  update: any,
  resourcePermissions: any,
  resourceFields: any[],
  change: { role: string; access?: any },
  permission: string
) => {
  const hasAccessFilter = has(change, 'access');
  switch (permission) {
    case 'canUpdateRecords': {
      // Make sure that user does not have any write permission on resource
      if (
        !get(resourcePermissions, 'canUpdateRecords', []).find((p) =>
          p.role.equals(change.role) && hasAccessFilter ? !p.access : p.access
        ) &&
        !get(resourcePermissions, 'canCreateRecords', []).find((p) =>
          p.role.equals(change.role)
        )
      ) {
        // Remove update permission to all fields.
        resourceFields
          .map((f) => f.name)
          .forEach((f) =>
            removeFieldPermission(
              update,
              resourceFields,
              f,
              change.role,
              'canUpdate'
            )
          );
      }
      break;
    }
    case 'canCreateRecords': {
      // Make sure that user does not have any write permission on resource
      if (
        !get(resourcePermissions, 'canUpdateRecords', []).find((p) =>
          p.role.equals(change.role)
        ) &&
        !get(resourcePermissions, 'canCreateRecords', []).find((p) =>
          p.role.equals(change.role) && hasAccessFilter ? !p.access : p.access
        )
      ) {
        // Remove update permission to all fields.
        resourceFields
          .map((f) => f.name)
          .forEach((f) =>
            removeFieldPermission(
              update,
              resourceFields,
              f,
              change.role,
              'canUpdate'
            )
          );
      }
      // Make sure that user does not have any see permission on resource
      if (
        !get(resourcePermissions, 'canSeeRecords', []).find((p) =>
          p.role.equals(change.role)
        ) &&
        !get(resourcePermissions, 'canCreateRecords', []).find((p) =>
          p.role.equals(change.role) && hasAccessFilter ? !p.access : p.access
        )
      ) {
        // Remove see permission to all fields.
        resourceFields
          .map((f) => f.name)
          .forEach((f) =>
            removeFieldPermission(
              update,
              resourceFields,
              f,
              change.role,
              'canSee'
            )
          );
      }
      break;
    }
    case 'canSeeRecords': {
      // Make sure that user does not have any see permission on resource
      if (
        !get(resourcePermissions, 'canSeeRecords', []).find((p) =>
          p.role.equals(change.role) && hasAccessFilter ? !p.access : p.access
        ) &&
        !get(resourcePermissions, 'canCreateRecords', []).find((p) =>
          p.role.equals(change.role)
        )
      ) {
        // Remove see permission to all fields.
        resourceFields
          .map((f) => f.name)
          .forEach((f) =>
            removeFieldPermission(
              update,
              resourceFields,
              f,
              change.role,
              'canSee'
            )
          );
      }
      break;
    }
    default: {
      break;
    }
  }
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
          // Add new permissions on resource
          if (obj.add && obj.add.length) {
            // Add permission
            addResourcePermission(update, obj.add, permission);
            /**
             * 'Common sense' rules, that apply if no existing permission for the role is set on this resource
             */
            obj.add.forEach((x) => {
              if (x.role) {
                // Ensure that the permissions make 'common sense'
                checkPermission(
                  context,
                  get(resource, 'permissions'),
                  x,
                  permission
                );
                // Apply common sense rules on fields
                automateFieldsPermission(
                  update,
                  get(resource, 'permissions'),
                  allResourceFields,
                  x,
                  permission
                );
              }
            });
          }
          // Remove permissions on resource
          if (obj.remove && obj.remove.length) {
            // Remove permission
            removeResourcePermission(update, obj.remove, permission);
            // Remove permission for all fields, if role does not have any other access
            obj.remove.forEach((x) => {
              if (x.role) {
                // Apply common sense rules on fields
                clearFieldsPermission(
                  update,
                  get(resource, 'permissions'),
                  allResourceFields,
                  x,
                  permission
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
        // Add permission on target field
        if (obj.add) {
          checkFieldPermission(
            context,
            get(resource, 'permissions'),
            allResourceFields,
            obj.add.field,
            obj.add.role,
            permission
          );
          addFieldPermission(
            update,
            allResourceFields,
            obj.add.field,
            obj.add.role,
            permission
          );
        }
        // Remove permission on target field
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
