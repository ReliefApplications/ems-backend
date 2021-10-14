import { GraphQLError, GraphQLList } from 'graphql';
import errors from '../../const/errors';
import { PullJobType } from '../types';
import { PullJob } from '../../models';

export default {
    /*  Returns all pull jobs available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: new GraphQLList(PullJobType),
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }

        const ability = context.user.ability;
        return PullJob.accessibleBy(ability, 'read');
    }
}
