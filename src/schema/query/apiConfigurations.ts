import { GraphQLError, GraphQLList } from 'graphql';
import errors from '../../const/errors';
import { ApiConfigurationType } from '../types';
import { ApiConfiguration } from '../../models';

export default {
    /*  Returns all api configurations available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: new GraphQLList(ApiConfigurationType),
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }

        const ability = context.user.ability;
        return ApiConfiguration.accessibleBy(ability, 'read');
    }
}
