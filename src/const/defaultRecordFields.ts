import {
  GraphQLBoolean,
  GraphQLID,
  GraphQLObjectType,
  GraphQLType,
  GraphQLString,
} from 'graphql';
import { GraphQLDateTime } from 'graphql-iso-date';
import GraphQLJSON from 'graphql-type-json';
import { UserType } from '../schema/types';

const customMeta = (type: string, name: string) => {
  return {
    type: GraphQLJSON,
    resolve(parent) {
      return parent
        ? {
            type,
            name,
            readOnly: true,
          }
        : {};
    },
  };
};

export const UserMetaType = new GraphQLObjectType({
  name: 'UserMeta',
  fields: () => ({
    id: customMeta('text', 'id'),
    username: customMeta('text', 'username'),
    name: customMeta('text', 'name'),
  }),
});

/*  List of default fields included in all queries on records built with the query builder
    Types are also accessible using the complete array.
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

export const defaultRecordFieldsFlat: string[] = defaultRecordFields.map(
  (x) => x.field
);

export const selectableDefaultRecordFieldsFlat: string[] =
  defaultRecordFields.reduce(
    (fields, field): string[] =>
      field.selectable ? [...fields, field.field] : fields,
    []
  );

export const defaultMetaFields: { field: string; type: GraphQLType }[] = [
  { field: 'id', type: GraphQLJSON },
  { field: 'incrementalId', type: GraphQLJSON },
  { field: 'form', type: GraphQLJSON },
  { field: 'createdAt', type: GraphQLJSON },
  { field: 'modifiedAt', type: GraphQLJSON },
  { field: 'createdBy', type: UserMetaType },
  { field: 'lastUpdatedBy', type: UserMetaType },
  { field: 'canUpdate', type: GraphQLJSON },
  { field: 'canDelete', type: GraphQLJSON },
  { field: '_source', type: GraphQLID },
];

export const defaultMetaFieldsFlat: string[] = defaultMetaFields.map(
  (x) => x.field
);
