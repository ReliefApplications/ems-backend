import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import errors from '../../const/errors';
import { ApiConfiguration } from '../../models';
import { ApiConfigurationType } from '../types';
import { AppAbility } from '../../security/defineAbilityFor';
import { status } from '../../const/enumTypes';
import { buildTypes } from '../../utils/schema';

export default {
    /*  Delete the passed apiConfiguration if authorized.
        Throws an error if not logged or authorized, or arguments are invalid.
    */
    type: ApiConfigurationType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) }
    },
    async resolve(parent, args, context) {
        const user = context.user;
        if (!user) {
            throw new GraphQLError(errors.userNotLogged);
        }
        const ability: AppAbility = user.ability;
        const filters = ApiConfiguration.accessibleBy(ability, 'delete').where({_id: args.id}).getFilter();
        const apiConfiguration = await ApiConfiguration.findOneAndDelete(filters);
        if (!apiConfiguration) throw new GraphQLError(errors.permissionNotGranted);
        if (apiConfiguration.status === status.active) {
            buildTypes();
        }
        return apiConfiguration;
    }
}
