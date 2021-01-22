import { GraphQLNonNull, GraphQLID } from "graphql";
import permissions from "../../const/permissions";
import checkPermission from "../../utils/checkPermission";
import { ApplicationType } from "../types";
import mongoose from 'mongoose';
import { Application, Page } from "../../models";

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
        const user = context.user;
        let application = null;
        if (checkPermission(user, permissions.canSeeApplications)) {
            application = await Application.findById(args.id);
        } else {
            const filters = {
                $and: [
                    { '_id': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x.application)) } },
                    { _id: args.id }
                ]
            };
            application = await Application.findOne(filters);
        }
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
        return application;
    },
}