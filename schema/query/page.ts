import { GraphQLNonNull, GraphQLID } from "graphql";
import permissions from "../../const/permissions";
import checkPermission from "../../utils/checkPermission";
import { PageType } from "../types";
import mongoose from 'mongoose';
import Page from '../../models/page';

export default {
    /*  Returns page from id if available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: PageType,
    args : {
        id: { type: new GraphQLNonNull(GraphQLID) }
    },
    resolve(parent, args, context) {
        const user = context.user;
        if (checkPermission(user, permissions.canSeeApplications)) {
            return Page.findById(args.id);
        } else {
            const filters = {
                'permissions.canSee': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                _id: args.id
            };
            return Page.findOne(filters);
        }
    },
}