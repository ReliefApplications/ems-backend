import { GraphQLList } from "graphql";
import { Channel } from "../../models";
import { ChannelType } from "../types";


export default {
    /*  List all channels available.
    */
    type: new GraphQLList(ChannelType),
    resolve(parent, args, context) {
        return Channel.find({});
    },
}