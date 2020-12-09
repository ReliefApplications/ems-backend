import { makeExecutableSchema } from "apollo-server-express";
import { printSchema } from "graphql";
import { camelize, singularize } from "inflection";
import { Resource } from "../models";
import getSchema from "./introspection/getSchema";
import resolver from "./resolver";

export default async () => {

    const resources = await Resource.find({}).select('name fields');

    const data = Object.fromEntries(
        resources.map(x => [camelize(singularize(x.name)), x.fields])
    );

    const ids = Object.fromEntries(
        resources.map(x => [camelize(singularize(x.name)), x._id])
    );

    const typesById = Object.fromEntries(
        resources.map(x => [x._id, camelize(singularize(x.name))])
    );

    const typeDefs = printSchema(await getSchema(data, typesById));
    const resolvers = resolver(data, ids);

    return makeExecutableSchema({
        typeDefs,
        resolvers
    });
}