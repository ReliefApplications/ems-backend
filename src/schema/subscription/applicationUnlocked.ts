import { GraphQLError, GraphQLID } from 'graphql';
import { withFilter } from 'graphql-subscriptions';
import errors from '../../const/errors';
import { ApplicationType } from '../types';

export default {
    type: ApplicationType,
    args: {
        application: { type: GraphQLID },
        lockedByID: { type: GraphQLID },
    },
    subscribe: (parent, args, context) => {
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }
        return withFilter(
            () => context.pubsub.asyncIterator('app_unlocked'),
            (payload, variables) => {
                if (variables.application) {
                    return payload.application === variables.application && payload.user !== user.id && payload.user != args.lockedByID;
                }
                return false;
            }
        )(parent, args, context)
    }
}
