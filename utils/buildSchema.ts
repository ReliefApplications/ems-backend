import { makeExecutableSchema, mergeSchemas } from "apollo-server-express";
import { printSchema } from "graphql";
import { camelize, singularize } from "inflection";
import { Form, Resource } from "../models";
import getSchema from "./introspection/getSchema";
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

        const typesById = Object.fromEntries(
            structures.map(x => [x._id, camelize(singularize(x.name))])
        );

        const typeDefs = printSchema(await getSchema(data, typesById));

        await new Promise((resolve, reject) => {
            fs.writeFile('schema.graphql', typeDefs, (err) => {
                if (err) {
                    reject(err);
                }
                else {
                    console.log('Schema generated.')
                    resolve(null);
                }
            });
        });

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

        await new Promise((resolve, reject) => {
            fs.writeFile('schema.graphql', printSchema(graphQLSchema), (err) => {
                if (err) {
                    reject(err);
                }
                else {
                    console.log('Schema generated.')
                    resolve(null);
                }
            });
        });

        return graphQLSchema;

    } catch (err) {
        await new Promise((resolve, reject) => {
            fs.writeFile('schema.graphql', printSchema(schema), (err) => {
                if (err) {
                    reject(err);
                }
                else {
                    console.log('Schema generated.')
                    resolve(null);
                }
            });
        });

        return schema;
    }
}