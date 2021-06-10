import { GraphQLError, GraphQLID, GraphQLList, GraphQLNonNull } from 'graphql';
import errors from '../../const/errors';
import { Application, PositionAttributeCategory, Role, User } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import { UserType } from '../types';

export default {
    /*  Deletes a user from application.
        Throws an error if not logged or authorized.
    */
    type: new GraphQLList(UserType),
    args: {
        ids: { type: new GraphQLNonNull(new GraphQLList(GraphQLID)) },
        application: { type: new GraphQLNonNull(GraphQLID) }
    },
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) {
            throw new GraphQLError(errors.userNotLogged);
        }
        const ability: AppAbility = user.ability;
        const application = await Application.findById(args.application);
        if (ability.can('update', 'User') && ability.can('update', application)) {
            const roles = await Role.find({ application: args.application });
            const positionAttributeCategories = await PositionAttributeCategory.find({ application: args.application });
            await User.updateMany({
                _id: {
                    $in: args.ids
                }
            }, {
                $pull: {
                    roles: { $in: roles.map(x => x.id)},
                    positionAttributes: { category: { $in: positionAttributeCategories.map(x => x.id) } }
                }
            });
            return User.find({_id: { $in: args.ids }});
        } else {
            throw new GraphQLError(errors.permissionNotGranted);
        }
    }
}
