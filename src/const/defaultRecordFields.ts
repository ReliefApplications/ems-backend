import {
  GraphQLBoolean,
  GraphQLID,
  GraphQLObjectType,
  GraphQLType,
  GraphQLString,
} from 'graphql';
import { GraphQLDateTime } from 'graphql-scalars';
import GraphQLJSON from 'graphql-type-json';
import { UserType } from '../schema/types';

/**
 * Resolver for user meta graphql type.
 *
 * @param info graphql info. Used to get fields.
 * @returns Json with queried properties metadata.
 */
export const userMetaResolver = (info: any) => {
  const fields = (info.fieldNodes[0]?.selectionSet?.selections || []).map(
    (x) => x.name.value
  );
  return fields.reduce((acc, field) => {
    acc[field] = {
      type: 'text',
      name: field,
      readOnly: true,
      permissions: {
        canSee: true,
        canUpdate: false,
      },
    };
    return acc;
  }, {});
};

/**
 * GraphQL user meta type definition
 */
export const UserMetaType = new GraphQLObjectType({
  name: 'UserMeta',
  fields: () => ({
    id: {
      type: GraphQLJSON,
    },
    username: {
      type: GraphQLJSON,
    },
    name: {
      type: GraphQLJSON,
    },
  }),
});

/**
 * List of default fields included in all queries on records built with the query builder
 * Types are also accessible using the complete array.
 */
export const defaultRecordFields: {
  field: string;
  type: GraphQLType;
  filterType: GraphQLType;
  selectable: boolean;
  args?: any;
}[] = [
  {
    field: 'id',
    type: GraphQLID,
    filterType: GraphQLID,
    selectable: true,
  },
  {
    field: 'incrementalId',
    type: GraphQLID,
    filterType: GraphQLID,
    selectable: true,
  },
  {
    field: 'form',
    type: GraphQLID,
    filterType: GraphQLString,
    selectable: true,
    args: {
      display: { type: GraphQLBoolean },
    },
  },
  {
    field: 'lastUpdateForm',
    type: GraphQLID,
    filterType: GraphQLString,
    selectable: true,
    args: {
      display: { type: GraphQLBoolean },
    },
  },
  {
    field: 'createdAt',
    type: GraphQLDateTime,
    filterType: GraphQLDateTime,
    selectable: true,
  },
  {
    field: 'modifiedAt',
    type: GraphQLDateTime,
    filterType: GraphQLDateTime,
    selectable: true,
  },
  {
    field: 'createdBy',
    type: UserType,
    filterType: GraphQLID,
    selectable: true,
  },
  {
    field: 'lastUpdatedBy',
    type: UserType,
    filterType: GraphQLID,
    selectable: true,
  },
  {
    field: 'canUpdate',
    type: GraphQLBoolean,
    filterType: GraphQLBoolean,
    selectable: false,
  },
  {
    field: 'canDelete',
    type: GraphQLBoolean,
    filterType: GraphQLBoolean,
    selectable: false,
  },
];

/**
 * Array with the names of the default fields for records built
 * using the query builder
 */
export const defaultRecordFieldsFlat: string[] = defaultRecordFields.map(
  (x) => x.field
);

/**
 * Array containing the selectable fields for records built
 * using the query builder
 */
export const selectableDefaultRecordFieldsFlat: string[] =
  defaultRecordFields.reduce(
    (fields, field): string[] =>
      field.selectable ? [...fields, field.field] : fields,
    []
  );

/** Array of objects with the field as keys as their GraphQL types as values */
export const defaultMetaFields: { field: string; type: GraphQLType }[] = [
  { field: 'id', type: GraphQLJSON },
  { field: 'incrementalId', type: GraphQLJSON },
  { field: 'form', type: GraphQLJSON },
  { field: 'lastUpdateForm', type: GraphQLJSON },
  { field: 'createdAt', type: GraphQLJSON },
  { field: 'modifiedAt', type: GraphQLJSON },
  { field: 'createdBy', type: UserMetaType },
  { field: 'lastUpdatedBy', type: UserMetaType },
  { field: 'canUpdate', type: GraphQLJSON },
  { field: 'canDelete', type: GraphQLJSON },
  { field: '_source', type: GraphQLID },
];

/** The names of the deafult meta fields */
export const defaultMetaFieldsFlat: string[] = defaultMetaFields.map(
  (x) => x.field
);
