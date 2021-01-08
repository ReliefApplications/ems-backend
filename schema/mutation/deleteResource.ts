import { GraphQLNonNull, GraphQLID, GraphQLError } from "graphql";
import permissions from "../../const/permissions";
import checkPermission from "../../utils/checkPermission";
import { ResourceType } from "../types";
import mongoose from 'mongoose';
import { Resource, Record, Form } from "../../models";
import errors from "../../const/errors";
import buildTypes from "../../utils/buildTypes";

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
            const deletedResource = await Resource.findByIdAndDelete(args.id);
            if (!deletedResource) throw new GraphQLError(errors.permissionNotGranted);

            const { _id: resourceId } = deletedResource;

            await Record.deleteMany({ resource: resourceId });

            await Form.deleteMany({ resource: resourceId });

            buildTypes()

            return deletedResource;
        } else {
            const filters = {
                'permissions.canDelete': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                _id: args.id
            };
            return Resource.findOneAndRemove(filters, null, () => buildTypes());
        }
    },
}