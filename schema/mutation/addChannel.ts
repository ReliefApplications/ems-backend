import { GraphQLNonNull, GraphQLString, GraphQLID, GraphQLError } from "graphql";
import errors from "../../const/errors";
import { Application, Channel } from "../../models";
import { ChannelType } from "../types";

export default {
    /*  Creates a new channel.
    */
    type: ChannelType,
    args: {
        title: { type: new GraphQLNonNull(GraphQLString) },
        application: { type: GraphQLID }
    },
    async resolve(parent, args, context) {
        const channel = new Channel({
            title: args.title,
            application: args.application
        });
        if (args.application) {
            const application = await Application.findById(args.application);
            if (!application) throw new GraphQLError(errors.dataNotFound);
            channel.application = args.application;
        }
        return channel.save();
    },
}