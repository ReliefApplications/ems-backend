import { GraphQLNonNull, GraphQLID, GraphQLList, GraphQLError } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import errors from '../../const/errors';
import { ResourceType } from '../types';
import { Resource } from '../../models';
import buildTypes from '../../utils/buildTypes';
import { AppAbility } from '../../security/defineAbilityFor';

export default {
    /*  Edits an existing resource.
        Throws GraphQL error if not logged or authorized.
    */
    type: ResourceType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        fields: { type: new GraphQLList(GraphQLJSON) },
        permissions: { type: GraphQLJSON }
    },
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }

        const ability: AppAbility = context.user.ability;
        if (!args || (!args.fields && !args.permissions)) {
            throw new GraphQLError(errors.invalidEditResourceArguments);
        } else {
            const update = {};
            Object.assign(update,
                args.fields && { fields: args.fields },
                args.permissions && { permissions: args.permissions }
            );
            const filters = Resource.accessibleBy(ability, 'update').where({_id: args.id}).getFilter();
            const resource = await Resource.findOneAndUpdate(
                filters,
                update,
                { new: true },
                () => args.fields && buildTypes()
            );
            if (!resource) { throw new GraphQLError(errors.permissionNotGranted); }
            return resource;
        }
    },
}