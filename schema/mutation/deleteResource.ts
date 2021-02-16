import { GraphQLNonNull, GraphQLID, GraphQLError } from "graphql";
import permissions from "../../const/permissions";
import checkPermission from "../../utils/checkPermission";
import { ResourceType } from "../types";
import mongoose from 'mongoose';
import { Resource, Record, Form, Version } from "../../models";
import errors from "../../const/errors";
import buildTypes from "../../utils/buildTypes";
import { AppAbility } from "../../security/defineAbilityFor";

export default {
    /*  Deletes a resource from its id.
        Throws GraphQL error if not logged or authorized.
    */
    type: ResourceType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
    },
    async resolve(parent, args, context) {
        // Check permissions
        const ability: AppAbility = context.user.ability;
        const filters = Resource.accessibleBy(ability, 'delete').where({_id: args.id}).getFilter();
        const deletedResource = await Resource.findOneAndDelete(filters);
        if (!deletedResource) throw new GraphQLError(errors.permissionNotGranted);

        // Delete recursively linked documents
        const { _id: resourceId } = deletedResource;
        const records = await Record.find({ resource: resourceId });
        for (const record of records) {
            await Version.deleteMany({ _id: { $in: record.versions.map(x => mongoose.Types.ObjectId(x))}});
            await Record.findByIdAndRemove(record._id);
        }
        await Form.deleteMany({ resource: resourceId });

        buildTypes()

        return deletedResource;
    },
}