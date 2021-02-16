import { GraphQLNonNull, GraphQLID, GraphQLError } from "graphql";
import { Record, Version } from "../../models";
import { RecordType } from "../types";
import mongoose from 'mongoose';
import { AppAbility } from "../../security/defineAbilityFor";
import errors from "../../const/errors";

export default {
    /*  Delete a record, if user has permission to update associated form / resource.
        Throw an error if not logged or authorized.
    */
    type: RecordType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
    },
    async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        if (ability.can('delete', 'Record')) {
            const record = await Record.findById(args.id);
            await Version.deleteMany({ _id: { $in: record.versions.map(x => mongoose.Types.ObjectId(x))}});
            return Record.findByIdAndRemove(args.id);
        } else {
            throw new GraphQLError(errors.permissionNotGranted);
        }
    },
}