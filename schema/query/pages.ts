import { GraphQLList } from "graphql";
import permissions from "../../const/permissions";
import checkPermission from "../../utils/checkPermission";
import { PageType } from "../types";
import mongoose from 'mongoose';
import { Page } from '../../models';

export default {
    /*  List all pages available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: new GraphQLList(PageType),
    resolve(parent, args, context) {
        const user = context.user;
        if (checkPermission(user, permissions.canSeeApplications)) {
            return Page.find({});
        } else {
            const filters = {
                'permissions.canSee': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id))}
            };
            return Page.find(filters);
        }
    }
}