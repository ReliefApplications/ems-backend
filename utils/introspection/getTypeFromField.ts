import { GraphQLBoolean, GraphQLID, GraphQLInt, GraphQLString } from "graphql"

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
        default: {
            return GraphQLString;
        }
    }
}