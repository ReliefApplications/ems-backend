import { GraphQLBoolean, GraphQLID, GraphQLType } from "graphql";
import { GraphQLDateTime } from "graphql-iso-date";
import GraphQLJSON from "graphql-type-json";
import { UserType } from "../schema/types";

/*  List of default fields included in all queries on records built with the query builder
    Types are also accessible using the complete array.
*/

export const defaultRecordFields: { field: string, type: (filter: boolean) => GraphQLType}[] = [
    { field: 'id', type: (filter) => GraphQLID},
    { field: 'createdAt', type: (filter) => GraphQLDateTime},
    { field: 'modifiedAt', type: (filter) => GraphQLDateTime},
    { field: 'createdBy', type: (filter) => filter ? GraphQLID : UserType },
    { field: 'canUpdate', type: (filter) => GraphQLBoolean },
    { field: 'canDelete', type: (filter) => GraphQLBoolean }
];

export const defaultRecordFieldsFlat: string[] = defaultRecordFields.map(x => x.field);

export const defaultMetaFields: { field: string, type: GraphQLType}[] = [
    { field: 'id', type: GraphQLJSON},
    { field: 'createdAt', type: GraphQLJSON },
    { field: 'modifiedAt', type: GraphQLJSON },
    { field: 'createdBy', type: GraphQLJSON },
    { field: 'canUpdate', type: GraphQLJSON },
    { field: 'canDelete', type: GraphQLJSON },
    { field: '_source', type: GraphQLID }
];

export const defaultMetaFieldsFlat: string[] = defaultMetaFields.map(x => x.field);