import { GraphQLError, GraphQLList } from 'graphql';
import { ResourceType } from '../types';
import { Resource } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import errors from '../../const/errors';

export default {
    /*  List all resources available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: new GraphQLList(ResourceType),
    resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }

        const ability: AppAbility = context.user.ability;
        return Resource.accessibleBy(ability, 'read');
    },
}
