import { GraphQLNonNull, GraphQLID, GraphQLError, GraphQLList, GraphQLInt } from 'graphql';
import errors from '../../const/errors';
import { Record } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';

export default {
    /*  Deletes a user.
        Throws an error if not logged or authorized.
    */
    type: GraphQLInt,
    args: {
        ids: { type: new GraphQLNonNull(new GraphQLList(GraphQLID)) }
    },
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }
        const ability: AppAbility = user.ability;
        if (ability.can('delete', 'Record')) {
            const result = await Record.deleteMany({_id: {$in: args.ids}});
            return result.deletedCount;
        } else {
            throw new GraphQLError(errors.permissionNotGranted);
        }
    }
}
