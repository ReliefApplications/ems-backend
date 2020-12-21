import { GraphQLObjectType, GraphQLID, GraphQLString } from "graphql";
import { Application } from "../../models";
import { ApplicationType } from "./application";

export const ChannelType = new GraphQLObjectType({
    name: 'Channel',
    fields: () => ({
        id: { type: GraphQLID },
        title: { type: GraphQLString },
        application: {
            type: ApplicationType,
            resolve(parent, args) {
                return Application.findOne( { _id: parent.application } );
            }
        },
    }),
});