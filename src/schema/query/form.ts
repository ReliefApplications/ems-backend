import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import errors from '../../const/errors';
import { FormType } from '../types';
import { Form } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import { canAccessContent } from '../../security/accessFromApplicationPermissions';

export default {
    /*  Returns form from id if available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: FormType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
    },
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }

        const ability: AppAbility = context.user.ability;
        const form = await Form.findOne(Form.accessibleBy(ability).where({ _id: args.id }).getFilter());
        if (!form) {
            // If user is admin and can see parent application, it has access to it
            if (user.isAdmin && await canAccessContent(args.id, 'read', ability)) {
                return Form.findById(args.id);
            }
        } else {
            return form;
        }
        throw new GraphQLError(errors.permissionNotGranted);
    },
};
