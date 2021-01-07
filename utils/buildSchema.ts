import { makeExecutableSchema, mergeSchemas } from "apollo-server-express";
import { camelize, singularize } from "inflection";
import { Form, Resource } from "../models";
import resolver from "./resolver";
import fs from 'fs';
import schema from '../schema';

export default async () => {
    try {
        const resources = await Resource.find({}).select('name fields') as any[];

        const forms = await Form.find({ core: { $ne: true }, status: 'active' }).select('name fields') as any[];

        const structures = resources.concat(forms);

        structures.forEach((x, index) => structures[index].name = x.name.split(' ').join('_') )

        const data = Object.fromEntries(
            structures.map(x => [camelize(singularize(x.name)), x.fields])
        );

        const ids = Object.fromEntries(
            structures.map(x => [camelize(singularize(x.name)), x._id])
        );

        const typeDefs = fs.readFileSync('schema.graphql', 'utf-8');

        const resolvers = resolver(data, ids);

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

        console.log('schema built');

        return graphQLSchema;

    } catch (err) {
        console.log(err);
        return schema;
    }
}