import { GraphQLNonNull, GraphQLID, GraphQLString, GraphQLError } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { contentType } from '../../const/contentType';
import errors from '../../const/errors';
import { PageType } from '../types';
import { Page, Workflow, Dashboard, Form } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';

export default {
    /*  Finds a page from its id and update it, if user is authorized.
        Update also the name and permissions of the linked content if it's not a form.
        Throws an error if not logged or authorized, or arguments are invalid.
    */
    type: PageType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        name: { type: GraphQLString },
        permissions: { type: GraphQLJSON }
    },
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }

        const ability: AppAbility = context.user.ability;
        if (!args || (!args.name && !args.permissions)) throw new GraphQLError(errors.invalidEditPageArguments);
        const update: { modifiedAt?: Date, name?: string, permissions?: any } = {
            modifiedAt: new Date()
        };
        Object.assign(update,
            args.name && { name: args.name },
            args.permissions && { permissions: args.permissions }
        );
        const filters = Page.accessibleBy(ability, 'update').where({_id: args.id}).getFilter();
        const page = await Page.findOneAndUpdate(filters, update, { new: true });
        if (!page) throw new GraphQLError(errors.dataNotFound);
        if (update.permissions) delete update.permissions;
        switch (page.type) {
            case contentType.workflow:
                await Workflow.findByIdAndUpdate(page.content, update);
                break;
            case contentType.dashboard:
                await Dashboard.findByIdAndUpdate(page.content, update);
                break;
            case contentType.form:
                if (update.name) delete update.name;
                await Form.findByIdAndUpdate(page.content, update);
                break;
            default:
                break;
        }
        return page;
    }
}