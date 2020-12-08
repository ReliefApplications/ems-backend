import { makeExecutableSchema } from "apollo-server-express";
import { printSchema } from "graphql";
import { Resource } from "../models";
import getSchema from "./introspection/getSchema";
import resolver from "./resolver";

export default async () => {

    const resources = await Resource.find({}).select('name fields');

    console.log(resources);

    const data = Object.fromEntries(
        resources.map(x => [x.name, x.fields])
    );

    const typeDefs = printSchema(await getSchema(data));
    const resolvers = resolver(data);

    return makeExecutableSchema({
        typeDefs,
        resolvers
    });
}