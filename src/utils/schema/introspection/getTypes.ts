import { GraphQLObjectType } from 'graphql';
import getFields from './getFields';

/**
 * Get GraphQL types from the structures.
 * @param fieldsByName fields of structures with name as key.
 * @returns array of GraphQL types of the structures.
 */
const getTypes = (fieldsByName: any) => {
    return Object.keys(fieldsByName)
        .map((name: string) => ({
            name: name,
            fields: getFields(fieldsByName[name]),
        }))
        .map((typeObject: any) => {
            return new GraphQLObjectType(typeObject)
        });
};

export default getTypes;
