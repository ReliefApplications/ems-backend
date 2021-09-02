import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import errors from '../../const/errors';
import deleteContent from '../../services/deleteContent';
import { PageType } from '../types';
import { Page, Application } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';

export default {
    /*  Delete a page from its id and erase its reference in the corresponding application.
        Also delete recursively the linked Workflow or Dashboard
        Throws an error if not logged or authorized, or arguments are invalid.
    */
    type: PageType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) }
    },
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }

        const ability: AppAbility = context.user.ability;
        const filters = Page.accessibleBy(ability, 'delete').where({_id: args.id}).getFilter();
        const page = Page.findOneAndDelete(filters);
        if (!page) throw new GraphQLError(errors.permissionNotGranted);
        const application = await Application.findOne({ pages: args.id });
        if (!application) throw new GraphQLError(errors.dataNotFound);
        const update = {
            modifiedAt: new Date(),
            $pull: { pages: args.id }
        };
        await Application.findByIdAndUpdate(
            application.id,
            update,
            { new: true }
        );
        await deleteContent(page);
        return page;
    }
}
