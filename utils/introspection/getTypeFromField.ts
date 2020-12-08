import { GraphQLBoolean, GraphQLID, GraphQLString } from "graphql"

export default (type: string) => {
    switch(type) {
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
        default: {
            return GraphQLString;
        }
    }
}