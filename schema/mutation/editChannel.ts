import { GraphQLNonNull, GraphQLID, GraphQLError, GraphQLString } from "graphql";
import errors from "../../const/errors";
import { Channel } from "../../models";
import { AppAbility } from "../../security/defineAbilityFor";
import { ChannelType } from "../types";

export default {
    /*  Edit a position attribute category.
        Throw GraphQL error if permission not granted.
    */
    type: ChannelType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        title: { type: new GraphQLNonNull(GraphQLString) },
    },
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }
        const ability: AppAbility = context.user.ability;
        const channel = await Channel.findById(args.id);
        if (!channel) throw new GraphQLError(errors.dataNotFound);
        if (ability.can('update', channel)) {
            return Channel.findByIdAndUpdate(
                args.id,
                {
                    title: args.title,
                },
                { new: true }
            );
        } else {
            throw new GraphQLError(errors.permissionNotGranted);
        }
    }
}