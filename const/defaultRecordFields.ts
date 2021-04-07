import { GraphQLBoolean, GraphQLID, GraphQLString, GraphQLType } from "graphql";
import { GraphQLDateTime } from "graphql-iso-date";
import { ResourceType, UserType } from "../schema/types";

/*  List of default fields included in all queries on records built with the query builder
    Types are also accessible using the complete array.
*/

export const defaultRecordFields: { field: string, type: (filter: boolean) => GraphQLType}[] = [
    { field: 'id', type: (filter) => GraphQLID},
    { field: 'createdAt', type: (filter) => GraphQLDateTime},
    { field: 'modifiedAt', type: (filter) => GraphQLDateTime},
    { field: 'createdBy', type: (filter) => filter ? GraphQLID : UserType },
    { field: 'canUpdate', type: (filter) => GraphQLBoolean },
    { field: 'canDelete', type: (filter) => GraphQLBoolean },
    { field: 'resource', type: (filter) => GraphQLID }
];

export const defaultFields: string[] = defaultRecordFields.map(x => x.field);