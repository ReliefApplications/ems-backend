import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import errors from '../../const/errors';
import { Channel, Notification, Role } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import { ChannelType } from '../types';

export default {
    /*  Delete a channel from its id and all linked notifications.
        Throw GraphQL error if permission not granted.
    */
    type: ChannelType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) }
    },
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }

        const ability: AppAbility = context.user.ability;

        if (ability.can('delete', 'Channel')) {
            await Notification.deleteMany( { channel: args.id } );
            const roles = await Role.find({ channels: args.id });
            for (const role of roles) {
                await Role.findByIdAndUpdate(
                    role.id,
                    { $pull: { channels: args.id } },
                    { new: true}
                );
            }
            return Channel.findByIdAndDelete(args.id);
        } else {
            throw new GraphQLError(errors.permissionNotGranted);
        }
    }
}
