import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import errors from '../../const/errors';
import {ApplicationType, decodeCursor} from '../types';
import mongoose from 'mongoose';
import { Application, Page } from '../../models';
import {AppAbility} from "../../security/defineAbilityFor";

const DEFAULT_FIRST = 10;

export default {
    /*  Returns application from id if available for the logged user.
        If asRole boolean is passed true, do the query as if the user was the corresponding role
        Throw GraphQL error if not logged.
    */
    type: ApplicationType,
    args : {
        id: { type: new GraphQLNonNull(GraphQLID) },
        asRole: { type: GraphQLID }
    },
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }

        const ability = context.user.ability;

        const first = args.first || DEFAULT_FIRST;
        const afterCursor = args.afterCursor;
        const cursorFilters = afterCursor ? {
            _id: {
                $gt: decodeCursor(afterCursor),
            }
        } : {};

        const filters = Application.accessibleBy(ability).where({_id: args.id}).getFilter();
        const application = await Application.findOne(filters);
        console.log('application');
        console.log(application);
        if (application && args.asRole) {
            const pages: Page[] = await Page.aggregate([
                { '$match' : {
                    'permissions.canSee': { $elemMatch: { $eq: mongoose.Types.ObjectId(args.asRole) } },
                    '_id' : { '$in' : application.pages }
                } },
                { '$addFields' : { '__order' : { '$indexOfArray': [ application.pages, '$_id' ] } } },
                { '$sort' : { '__order' : 1 } }
            ]);
            application.pages = pages.map(x => x._id);
        }
        if (!application) {
            throw new GraphQLError(errors.permissionNotGranted);
        }
        console.log('application 2');
        console.log(application);
        return application;

    },
}
