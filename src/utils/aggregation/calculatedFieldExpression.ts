import { accessibleBy } from '@casl/mongoose';
import { Form, Record as RecordModel, Resource, User } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { RelatedFieldOperation } from '../../const/calculatedFields';
import {
  getExpressionFromString,
  OperationTypeMap,
} from './expressionFromString';

type CalculatedFieldContext = {
  parentResourceId?: string;
  resourceFields?: any[];
  ability?: AppAbility;
  user?: User;
};

type ResolvedRelatedField = {
  childResourceId: string;
  childFormIds: string[];
  childResourceFields: any[];
  childFieldType: string;
  childField: any;
  linkFieldNames: string[];
};

/** Default field types for built-in record fields. */
const DEFAULT_FIELD_TYPES: Record<string, string> = {
  id: 'text',
  incrementalId: 'text',
  createdAt: 'datetime',
  modifiedAt: 'datetime',
  form: 'text',
  lastUpdateForm: 'text',
};

/**
 * Gets the record field type, including default fields.
 *
 * @param fields Resource fields
 * @param fieldName Field name
 * @returns Field type, if any
 */
export const getRecordFieldType = (
  fields: any[],
  fieldName: string
): string | undefined => {
  return (
    fields.find((field) => field.name === fieldName)?.type ??
    DEFAULT_FIELD_TYPES[fieldName]
  );
};

/**
 * Checks whether the current user can read a resource field.
 *
 * @param user Current user
 * @param field Resource field
 * @returns Whether the field is readable
 */
export const canReadCalculatedField = (
  user: User | undefined,
  field: any
): boolean => {
  if (!field || !field.permissions?.canSee || !user?.roles?.length) {
    return true;
  }

  return user.roles.some((role: any) =>
    field.permissions.canSee.some((permission: any) => {
      const permissionId = permission.role ? permission.role : permission;
      return permissionId?.equals
        ? permissionId.equals(role._id)
        : permissionId?.toString() === role._id?.toString();
    })
  );
};

/**
 * Resolves related selector metadata against forms and child resources.
 *
 * @param operation Related field operation
 * @param context Current calculated field context
 * @returns Resolved related selector metadata
 */
export const resolveRelatedFieldOperation = async (
  operation: RelatedFieldOperation,
  context: CalculatedFieldContext
): Promise<ResolvedRelatedField> => {
  if (!context.parentResourceId) {
    throw new Error(
      `Related selector "${operation.relation}" requires a parent resource context`
    );
  }

  const forms = await Form.find({
    'fields.resource': context.parentResourceId,
    'fields.relatedName': operation.relation,
  }).select('resource fields');

  const matches = forms.flatMap((form: any) =>
    (form.fields || [])
      .filter(
        (field: any) =>
          field.resource?.toString() === context.parentResourceId &&
          field.relatedName === operation.relation
      )
      .map((field: any) => ({
        childResourceId: form.resource?.toString(),
        childFormId: form._id?.toString(),
        linkFieldName: field.name,
      }))
  );

  if (matches.length === 0) {
    throw new Error(`Invalid relation name: ${operation.relation}`);
  }

  const childResourceIds = [
    ...new Set(matches.map((match) => match.childResourceId)),
  ];
  if (childResourceIds.length !== 1 || !childResourceIds[0]) {
    throw new Error(
      `Ambiguous relation name: ${operation.relation}. Use a unique related name.`
    );
  }

  const childResource = await Resource.findById(childResourceIds[0]).select(
    'fields'
  );
  if (!childResource) {
    throw new Error(
      `Unable to resolve child resource for relation ${operation.relation}`
    );
  }

  const childField = childResource.fields.find(
    (field: any) => field.name === operation.field
  );
  const childFieldType = getRecordFieldType(
    childResource.fields,
    operation.field
  );
  if (!childFieldType) {
    throw new Error(
      `Invalid child field "${operation.field}" for relation ${operation.relation}`
    );
  }

  if (operation.sortField) {
    const sortFieldType = getRecordFieldType(
      childResource.fields,
      operation.sortField
    );
    if (!sortFieldType) {
      throw new Error(
        `Invalid sort field "${operation.sortField}" for relation ${operation.relation}`
      );
    }
  }

  return {
    childResourceId: childResourceIds[0],
    childFormIds: [
      ...new Set(
        matches
          .map((match) => match.childFormId)
          .filter((childFormId): childFormId is string => !!childFormId)
      ),
    ],
    childResourceFields: childResource.fields,
    childFieldType,
    childField,
    linkFieldNames: [...new Set(matches.map((match) => match.linkFieldName))],
  };
};

/**
 * Gets the filter needed to enforce record-level permissions in lookups.
 *
 * @param ability Current user ability
 * @returns Permission filter
 */
export const getRelatedRecordPermissionFilter = (ability?: AppAbility) => {
  if (!ability) {
    return null;
  }

  return RecordModel.find(accessibleBy(ability, 'read').Record).getFilter();
};

/**
 * Infers the resulting field type for a calculated expression.
 *
 * @param expression Calculated field expression
 * @param context Current calculated field context
 * @returns Calculated field type
 */
export const getCalculatedFieldType = async (
  expression: string,
  context: CalculatedFieldContext
): Promise<string> => {
  const parsedExpression = getExpressionFromString(expression);

  if ('operation' in parsedExpression) {
    if (parsedExpression.operation === 'relatedField') {
      const relatedField = await resolveRelatedFieldOperation(
        parsedExpression,
        context
      );
      return relatedField.childFieldType;
    }

    return OperationTypeMap[parsedExpression.operation] ?? 'text';
  }

  if (parsedExpression.type === 'field') {
    return (
      getRecordFieldType(
        context.resourceFields || [],
        parsedExpression.value.field
      ) || 'text'
    );
  }

  if (parsedExpression.type === 'info') {
    return getRecordFieldType([], parsedExpression.value as string) || 'text';
  }

  if (parsedExpression.type === 'const') {
    switch (typeof parsedExpression.value) {
      case 'number':
        return 'numeric';
      case 'boolean':
        return 'boolean';
      default:
        return 'text';
    }
  }

  return 'text';
};

/**
 * Resolves a related field to either its value pipeline or a null assignment when field access is denied.
 *
 * @param operation Related field operation
 * @param context Current calculated field context
 * @returns Related field metadata with field-level access check
 */
export const getResolvedRelatedField = async (
  operation: RelatedFieldOperation,
  context: CalculatedFieldContext
) => {
  const relatedField = await resolveRelatedFieldOperation(operation, context);
  const canReadField = canReadCalculatedField(
    context.user,
    relatedField.childField
  );

  return {
    ...relatedField,
    canReadField,
    permissionFilter: getRelatedRecordPermissionFilter(context.ability),
  };
};
