import { GraphQLNonNull, GraphQLID, GraphQLError } from "graphql";
import errors from "../../const/errors";
import { ApplicationType } from "../types";
import mongoose from 'mongoose';
import { Application, Page } from "../../models";
import { AppAbility } from "../../security/defineAbilityFor";
import checkPermission from "../../utils/checkPermission";
import permissions from "../../const/permissions";

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


        /*
        let application = null;
        const ability: AppAbility = context.user.ability;
        const filters = Application.accessibleBy(ability, 'read').where({_id: args.id}).getFilter();
        application = await Application.findOne(filters);
        if (application) { 
        //if (application && args.asRole) { // What is args.as role? I am currently prevented from entering this
            const pages: Page[] = await Page.aggregate([
                { '$match' : {
                    'permissions.canSee': { $elemMatch: { $eq: mongoose.Types.ObjectId(args.asRole) } },
                    '_id' : { '$in' : application.pages }
                } },
                { '$addFields' : { '__order' : { '$indexOfArray': [ application.pages, '$_id' ] } } },
                { '$sort' : { '__order' : 1 } }
            ]);
            application.pages = pages.map(x => x._id);
        } else {
            throw new GraphQLError(errors.permissionNotGranted);
        }
        return application;
        */
    },
}