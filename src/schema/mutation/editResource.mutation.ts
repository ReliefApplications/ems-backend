import mongoose from 'mongoose';
import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLList,
  GraphQLError,
  GraphQLString,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { ResourceType } from '../types';
import { findDuplicateFields, updateIncrementalIds } from '@utils/form';
import {
  getExpressionFromString,
  OperationTypeMap,
} from '@utils/aggregation/expressionFromString';
import { DefaultIncrementalIdShapeT, Resource } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { get, has, isArray, isEqual, isNil } from 'lodash';
import { logger } from '@lib/logger';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';
import { IdShapeType } from '@schema/inputs/id-shape.input';
import buildCalculatedFieldPipeline from '@utils/aggregation/buildCalculatedFieldPipeline';

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

  const hasFieldPermissions = !isNil(fields[fieldIndex].permissions);
  if (!hasFieldPermissions) {
    const newPermission = {
      [`fields.${fieldIndex}.permissions`]: {
        canSee: [],
        canUpdate: [],
      },
    };
    if (update.$set) Object.assign(update.$set, newPermission);
    else Object.assign(update, { $set: newPermission });
  }

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
 * @param permissions full permissions object in graphQL args
 */
const checkPermission = (
  context,
  resourcePermissions: any,
  change: { role: string; access?: any },
  permission: string,
  permissions: any
) => {
  switch (permission) {
    case 'canUpdateRecords': {
      // If there is a global see permission for this role it should be okay.
      if (
        get(resourcePermissions, 'canSeeRecords', []).find((p) =>
          p.role.equals(change.role)
        )
      ) {
        break;
      }
      // Otherwise if the current rule apply see permissions as well it's okay.
      if (change.access) {
        const canSee = get(permissions, 'canSeeRecords', []);
        if (
          !Array.isArray(canSee) &&
          canSee.add &&
          canSee.add.length &&
          canSee.add.some(
            (x) => x.role === change.role && isEqual(x.access, change.access)
          )
        ) {
          break;
        }
      }
      throw new GraphQLError(
        context.i18next.t(
          'mutations.resource.edit.errors.permission.notVisible'
        )
      );
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

  const hasFieldPermissions = !isNil(fields[fieldIndex].permissions);
  // If no permissions on field, no need to remove anything
  // This prevents an error on the $pull operation
  if (!hasFieldPermissions) return;

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

/** Arguments for the editResource mutation */
type EditResourceArgs = {
  id: string | mongoose.Types.ObjectId;
  fields: any;
  permissions?: any;
  fieldsPermissions?: any;
  calculatedField?: any;
  idShape?: DefaultIncrementalIdShapeT;
  importField?: string;
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
    idShape: { type: IdShapeType },
    importField: { type: GraphQLString },
  },
  async resolve(parent, args: EditResourceArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      if (
        !args ||
        (!args.fields &&
          !args.permissions &&
          !args.calculatedField &&
          !args.fieldsPermissions &&
          !args.idShape &&
          !args.importField)
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
      Object.assign(update, args.fields && { fields: args.fields });
      Object.assign(update, args.idShape && { idShape: args.idShape });
      Object.assign(
        update,
        args.importField && { importField: args.importField }
      );

      const allResourceFields = resource.fields;

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
                    permission,
                    permissions
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
          const obj: SimpleFieldPermissionChange = permissions[permission];
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

      // Update calculated fields
      if (args.calculatedField) {
        const calculatedField: CalculatedFieldChange = args.calculatedField;

        // Check if calculated field expression is too long
        if (calculatedField.add || calculatedField.update) {
          const expression =
            calculatedField.add?.expression ??
            calculatedField.update?.expression;

          const pipeline = buildCalculatedFieldPipeline(
            expression,
            '',
            context.timeZone
          );

          if (pipeline[0].$facet.calcFieldFacet.length > 50) {
            throw new GraphQLError(
              context.i18next.t(
                'mutations.resource.edit.errors.calculatedFieldTooLong'
              )
            );
          }
        }

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
          //First remove the old field
          const pullCalculatedField = {
            fields: {
              name: calculatedField.update.oldName,
            },
          };
          if (update.$pull) Object.assign(update.$pull, pullCalculatedField);
          else Object.assign(update, { $pull: pullCalculatedField });
          const expression = getExpressionFromString(
            calculatedField.update.expression
          );

          const oldField = allResourceFields.find(
            (field) => field.name === calculatedField.update.oldName
          );

          //Then add the updated one
          const pushCalculatedField = {
            fields: {
              isCalculated: true,
              name: calculatedField.update.name,
              expression: calculatedField.update.expression,
              type: OperationTypeMap[expression.operation] ?? 'text',
              permissions: oldField.permissions,
            },
          };

          if (calculatedField.update.oldName !== calculatedField.update.name)
            findDuplicateFields([
              ...allResourceFields,
              { name: calculatedField.update.name },
            ]);

          if (update.$addToSet)
            Object.assign(update.$addToSet, pushCalculatedField);
          else Object.assign(update, { $addToSet: pushCalculatedField });
        }
      }

      if (args.idShape) {
        if (update.$set) {
          Object.assign(update.$set, { ['idShape']: args.idShape });
        } else {
          Object.assign(update, { $set: { ['idShape']: args.idShape } });
        }
      }

      if (args.importField) {
        if (update.$set) {
          Object.assign(update.$set, { ['importField']: args.importField });
        } else {
          Object.assign(update, {
            $set: { ['importField']: args.importField },
          });
        }
      }

      // Split the request in three parts, to avoid conflict
      if (!!update.$set) {
        await Resource.findByIdAndUpdate(args.id, { $set: update.$set });
      }

      if (!!update.$pull) {
        await Resource.findByIdAndUpdate(args.id, { $pull: update.$pull });
      }

      if (args.idShape) {
        await updateIncrementalIds(resource, args.idShape);
      }

      return await Resource.findByIdAndUpdate(
        args.id,
        update.$addToSet ? { $addToSet: update.$addToSet } : {},
        { new: true }
      );
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      if (err instanceof GraphQLError) throw err;
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
