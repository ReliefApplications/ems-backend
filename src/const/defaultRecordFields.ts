import { GraphQLBoolean, GraphQLID, GraphQLObjectType, GraphQLType } from 'graphql';
import { GraphQLDateTime } from 'graphql-iso-date';
import GraphQLJSON from 'graphql-type-json';
import { UserType } from '../schema/types';

const customMeta = (type: string, name: string) => {
  return {
    type: GraphQLJSON,
    resolve(parent) {
      return parent ? {
        type,
        name,
        readOnly: true,
      } : {};
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

export const defaultRecordFields: { field: string, type: GraphQLType, filterType: GraphQLType }[] = [
  { 
    field: 'id',
    type: GraphQLID,
    filterType: GraphQLID,
  },
  { 
    field: 'createdAt',
    type: GraphQLDateTime,
    filterType: GraphQLDateTime,
  },
  { 
    field: 'modifiedAt',
    type: GraphQLDateTime,
    filterType: GraphQLDateTime,
  },
  { 
    field: 'createdBy',
    type: UserType,
    filterType: GraphQLID,
  },
  { 
    field: 'lastUpdatedBy',
    type: UserType,
    filterType: GraphQLID,
  },
  {
    field: 'canUpdate',
    type: GraphQLBoolean,
    filterType: GraphQLBoolean,
  },
  {
    field: 'canDelete',
    type: GraphQLBoolean,
    filterType: GraphQLBoolean,
  },
];

export const defaultRecordFieldsFlat: string[] = defaultRecordFields.map(x => x.field);

export const defaultMetaFields: { field: string, type: GraphQLType }[] = [
  { field: 'id', type: GraphQLJSON },
  { field: 'createdAt', type: GraphQLJSON },
  { field: 'modifiedAt', type: GraphQLJSON },
  { field: 'createdBy', type: UserMetaType },
  { field: 'lastUpdatedBy', type: UserMetaType },
  { field: 'canUpdate', type: GraphQLJSON },
  { field: 'canDelete', type: GraphQLJSON },
  { field: '_source', type: GraphQLID },
];

export const defaultMetaFieldsFlat: string[] = defaultMetaFields.map(x => x.field);
