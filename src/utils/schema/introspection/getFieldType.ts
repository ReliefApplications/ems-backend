import { GraphQLBoolean, GraphQLFloat, GraphQLID, GraphQLInt, GraphQLList, GraphQLScalarType, GraphQLString, GraphQLType } from 'graphql';
import {
    GraphQLDate, GraphQLDateTime, GraphQLTime
} from 'graphql-iso-date';
import GraphQLJSON from 'graphql-type-json';

interface Field {
    type: string;
    resource?: string;
}

/**
 * Get GraphQL type from field definition.
 * @param field field definition.
 * @param filter true if the type is for a filter type.
 * @returns GraphQL type.
 */
const getFieldType = (field: Field, filter = false): GraphQLScalarType | GraphQLScalarType | GraphQLList<GraphQLType> | GraphQLScalarType[] => {
    if (field.resource && field.type === 'text') {
        return GraphQLID;
    }
    switch (field.type) {
        case 'resource': {
            return GraphQLID;
        }
        case 'resources': {
            return filter ? new GraphQLList(GraphQLID) : [GraphQLID];
        }
        case 'text': {
            return GraphQLString;
        }
        case 'url': {
            return GraphQLString;
        }
        case 'dropdown': {
            return GraphQLString;
        }
        case 'radiogroup': {
            return GraphQLString;
        }
        case 'comment': {
            return GraphQLString;
        }
        case 'boolean': {
            return GraphQLBoolean;
        }
        case 'numeric': {
            return GraphQLInt;
        }
        case 'decimal': {
            return GraphQLFloat;
        }
        case 'date': {
            return GraphQLDate;
        }
        case 'datetime': {
            return GraphQLDateTime;
        }
        case 'datetime-local': {
            return GraphQLDateTime;
        }
        case 'time': {
            return GraphQLTime;
        }
        case 'multipletext': {
            return GraphQLJSON;
        }
        case 'matrix': {
            return GraphQLJSON;
        }
        case 'matrixdropdown': {
            return GraphQLJSON;
        }
        case 'matrixdynamic': {
            return GraphQLJSON;
        }
        case 'checkbox': {
            return GraphQLJSON;
        }
        case 'file': {
            return GraphQLJSON;
        }
        case 'tagbox': {
            return GraphQLJSON;
        }
        case 'owner': {
            return GraphQLJSON;
        }
        default: {
            return GraphQLString;
        }
    }
}

export default getFieldType;
