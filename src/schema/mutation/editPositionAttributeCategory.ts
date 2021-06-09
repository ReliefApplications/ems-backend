import { GraphQLNonNull, GraphQLID, GraphQLError, GraphQLString } from 'graphql';
import errors from '../../const/errors';
import { Application, PositionAttributeCategory } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import { PositionAttributeCategoryType } from '../types';

export default {
    /*  Edit a position attribute category.
        Throw GraphQL error if permission not granted.
    */
    type: PositionAttributeCategoryType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        application: { type: new GraphQLNonNull(GraphQLID) },
        title: { type: new GraphQLNonNull(GraphQLString) },
    },
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }
        const ability: AppAbility = context.user.ability;
        const application = await Application.findById(args.application);
        if (!application) throw new GraphQLError(errors.dataNotFound);
        if (ability.can('update', application)) {
            return PositionAttributeCategory.findByIdAndUpdate(
                args.id,
                {
                    title: args.title,
                },
                { new: true }
            );
        } else {
            throw new GraphQLError(errors.permissionNotGranted);
        }
    }
}