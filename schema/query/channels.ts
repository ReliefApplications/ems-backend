import { GraphQLID, GraphQLList } from "graphql";
import { Channel } from "../../models";
import { ChannelType } from "../types";


export default {
    /*  List all channels available.
    */
    type: new GraphQLList(ChannelType),
    args: {
        application: { type: GraphQLID }
    },
    resolve(parent, args, context) {
        if (args.application) return Channel.find({ application: args.application });
        return Channel.find();
    },
}