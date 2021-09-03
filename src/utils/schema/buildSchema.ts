import { makeExecutableSchema, mergeSchemas } from 'apollo-server-express';
import { getResolvers } from './resolvers';
import fs from 'fs';
import schema from '../../schema';
import { GraphQLSchema } from 'graphql';
import { getStructures } from './getStructures';

const GRAPHQL_SCHEMA_FILE = 'src/schema.graphql';

/**
 * Build a new GraphQL schema to add to the default one, providing API for the resources / forms.
 * @returns GraphQL schema built from the active resources / forms of the database.
 */
export const buildSchema = async (): Promise<GraphQLSchema> => {
    try {

        const structures = await getStructures();

        const fieldsByName: any = structures.reduce((obj, x) => {
            obj[x.name] = x.fields;
            return obj;
        }, {});

        const idsByName: any = structures.reduce((obj, x) => {
            obj[x.name] = x._id;
            return obj;
        }, {});

        const typeDefs = fs.readFileSync(GRAPHQL_SCHEMA_FILE, 'utf-8');

        const resolvers = getResolvers(fieldsByName, idsByName);

        const builtSchema = makeExecutableSchema({
            typeDefs,
            resolvers
        });

        const graphQLSchema = mergeSchemas({
            schemas: [
                schema,
                builtSchema
            ]
        });

        console.log('🔨 Schema built');

        return graphQLSchema;

    } catch (err) {
        console.log(err);
        return schema;
    }
}
