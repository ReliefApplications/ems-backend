import { GraphQLError, GraphQLID, GraphQLNonNull, GraphQLString } from 'graphql';
import errors from '../../const/errors';
import { Application, PositionAttributeCategory } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import { PositionAttributeCategoryType } from '../types';

export default {
    type: PositionAttributeCategoryType,
    args: {
        title: { type: new GraphQLNonNull(GraphQLString) },
        application: { type: new GraphQLNonNull(GraphQLID) }
    },
    async resolve(parent, args, context) {
        const user = context.user;
        if (!user) {
            throw new GraphQLError(errors.userNotLogged);
        }
        const ability: AppAbility = user.ability;
        const application = await Application.findById(args.application);
        if (!application) throw new GraphQLError(errors.dataNotFound);
        if (ability.can('update', application)) {
            const category = new PositionAttributeCategory({
                title: args.title,
                application: args.application
            });
            return category.save();
        } else {
            throw new GraphQLError(errors.permissionNotGranted);
        }
    }
};
