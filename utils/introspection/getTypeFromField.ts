import { GraphQLBoolean, GraphQLID, GraphQLInt, GraphQLList, GraphQLString } from 'graphql';
import {
    GraphQLDate, GraphQLDateTime, GraphQLTime
  } from 'graphql-iso-date';
import GraphQLJSON from 'graphql-type-json';

export default (field: {type: string, resource?: string}) => {
    if (field.resource) {
        return GraphQLID;
    }
    switch(field.type) {
        case 'resource': {
            return GraphQLID;
        }
        case 'text': {
            return GraphQLString;
        }
        case 'dropdown': {
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
        case 'checkbox': {
            return new GraphQLList(GraphQLString);
        }
        default: {
            return GraphQLString;
        }
    }
}