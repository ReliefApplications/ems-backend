import { GraphQLError, GraphQLList } from 'graphql';
import errors from '../../const/errors';
import { NotificationType } from '../types';
import { Notification } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';

export default {
    /*  Returns all the notifications corresponding to the channels subscribes by the logged user.
        Throw GraphQL error if not logged.
    */
    type: new GraphQLList(NotificationType),
    resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }

        const ability: AppAbility = context.user.ability;
        return Notification.accessibleBy(ability, 'read').sort({ createdAt: -1 });
    }
}
