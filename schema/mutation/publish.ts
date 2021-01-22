import { GraphQLBoolean, GraphQLError, GraphQLID, GraphQLList, GraphQLNonNull } from "graphql";
import errors from "../../const/errors";
import { Channel, Record } from "../../models";
import pubsubSafe from "../../server/pubsubSafe";

export default {
    type: GraphQLBoolean,
    args: {
        ids: { type: new GraphQLNonNull(GraphQLList(GraphQLID)) },
        channel: { type: new GraphQLNonNull(GraphQLID) }
    },
    async resolve(parent, args, context) {
        const user = context.user;
        if (!user) throw new GraphQLError(errors.userNotLogged);

        const channel = await Channel.findById(args.channel);
        if (!channel || !channel.application) {
            throw new GraphQLError(errors.dataNotFound);
        }

        const records = await Record.find({}).where('_id').in(args.ids).select('data');

        const publisher = await pubsubSafe();
        publisher.publish(`${process.env.RABBITMQ_APPLICATION}.${channel.application}.${args.channel}`, records);
        return true;
    }
}