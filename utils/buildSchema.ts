import { makeExecutableSchema } from "apollo-server-express";
import { printSchema } from "graphql";
import { Resource } from "../models";
import getSchema from "./introspection/getSchema";
import resolver from "./resolver";

export default async () => {

    const resources = await Resource.find({}).select('name fields');

    const data = Object.fromEntries(
        resources.map(x => [x.name, x.fields])
    );

    const ids = Object.fromEntries(
        resources.map(x => [x.name, x._id])
    );

    const typeDefs = printSchema(await getSchema(data));
    const resolvers = resolver(data, ids);

    return makeExecutableSchema({
        typeDefs,
        resolvers
    });
}