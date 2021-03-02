import { GraphQLBoolean, GraphQLID, GraphQLType } from "graphql";
import { GraphQLDateTime } from "graphql-iso-date";
import { UserType } from "../schema/types";

/*  List of default fields included in all queries on records built with the query builder
    Types are also accessible using the complete array.
*/

export const defaultRecordFields: { field: string, type: (filter: boolean) => GraphQLType}[] = [
    { field: 'id', type: (filter) => GraphQLID},
    { field: 'createdAt', type: (filter) => GraphQLDateTime},
    { field: 'createdBy', type: (filter) => filter ? GraphQLID : UserType },
    { field: 'canUpdate', type: (filter) => GraphQLBoolean }
];

export const defaultFields: string[] = defaultRecordFields.map(x => x.field);