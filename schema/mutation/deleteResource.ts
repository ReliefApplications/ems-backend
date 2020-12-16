import { GraphQLNonNull, GraphQLID, GraphQLError } from "graphql";
import permissions from "../../const/permissions";
import checkPermission from "../../utils/checkPermission";
import { ResourceType } from "../types";
import mongoose from 'mongoose';
import { Resource, Record, Form } from "../../models";

export default {
    /*  Deletes a resource from its id.
        Throws GraphQL error if not logged or authorized.
    */
    type: ResourceType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
    },
   async resolve(parent, args, context) {
        const user = context.user;
        if (checkPermission(user, permissions.canManageResources)) {
            const deletedResource = await Record.findById(args.id);
            const {_id: resourceId} = deletedResource;

            const childRecord = await Record.find({resource: resourceId})
            childRecord.map(async record => await Record.findByIdAndDelete(record._id))
            
            const childForms = await Form.find({resource: resourceId})
            childForms.map(async form => Form.findByIdAndDelete(form._id))
            
            return deletedResource;
        } else {
            const filters = {
                'permissions.canDelete': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                _id: args.id
            };
            return Resource.findOneAndRemove(filters);
        }
    },
}