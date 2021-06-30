import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import errors from '../../const/errors';
import { ResourceType } from '../types';
import { Resource } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';

export default {
    /*  Returns resource from id if available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: ResourceType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
    },
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }

        const ability: AppAbility = context.user.ability;
        const filters = Resource.accessibleBy(ability, 'read').where({_id: args.id}).getFilter();
        const resource = await Resource.findOne(filters);
        if (!resource) {
            throw new GraphQLError(errors.permissionNotGranted);
        }
        return resource;
    },
}
