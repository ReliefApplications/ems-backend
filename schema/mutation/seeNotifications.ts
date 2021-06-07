import { GraphQLNonNull, GraphQLID, GraphQLError, GraphQLList, GraphQLBoolean } from 'graphql';
import errors from '../../const/errors';
import { Notification } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';

export default {
    /*  Finds multiple notifications and mark them as read.
        Throws an error if arguments are invalid.
    */
    type: GraphQLBoolean,
    args: {
        ids: { type: new GraphQLNonNull(GraphQLList(GraphQLID)) },
    },
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }

        const ability: AppAbility = context.user.ability;
        if (!args) { throw new GraphQLError(errors.invalidSeeNotificationsArguments); }
        const filters = Notification.accessibleBy(ability, 'update').where({_id: { $in: args.ids }}).getFilter();
        const result = await Notification.updateMany(filters, { $push: { seenBy: user.id }} );
        return result.ok === 1;
    },
}