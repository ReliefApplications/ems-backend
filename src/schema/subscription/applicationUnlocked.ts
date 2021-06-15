import { GraphQLError, GraphQLID } from 'graphql';
import { withFilter } from 'graphql-subscriptions';
import errors from '../../const/errors';
import { ApplicationType } from '../types';

export default {
    type: ApplicationType,
    args: {
        id: { type: GraphQLID }
    },
    subscribe: (parent, args, context) => {
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }
        return withFilter(
            () => context.pubsub.asyncIterator('app_lock'),
            (payload, variables) => {
                if (variables.id) {
                    return payload.application._id === variables.id;
                }
                return false;
            }
        )(parent, args, context)
    },
    resolve: (payload) => {
        return payload.application;
    }
}
