import { GraphQLNonNull, GraphQLID, GraphQLError, GraphQLBoolean } from "graphql";
import errors from "../../const/errors";
import { Form, Record, Version } from "../../models";
import { RecordType } from "../types";

export default {
    /*  Convert a record from one form type to an other form type from the same family (i. e. with same parent resource)
        It can either be a copy or an overwrite.
    */
    type: RecordType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        form: { type: new GraphQLNonNull(GraphQLID) },
        copyRecord: { type: new GraphQLNonNull(GraphQLBoolean) }
    },
    async resolve(parent, args) {
        const oldRecord = await Record.findById(args.id);
        const oldForm = await Form.findById(oldRecord.form);
        const targetForm = await Form.findById(args.form);
        if (!oldForm.resource.equals(targetForm.resource)) throw new GraphQLError(errors.invalidConversion);
        const ignoredFields = oldForm.fields.filter(oldField => !targetForm.fields.some(targetField => oldField.name === targetField.name));
        const data = oldRecord.data;
        for (const field of ignoredFields) {
            delete data[field.name]
        }
        const oldVersions = oldRecord.versions;
        if (ignoredFields) {
            const version = new Version({
                createdAt: oldRecord.modifiedAt ? oldRecord.modifiedAt : oldRecord.createdAt,
                data: data,
            });
            await version.save();
            oldVersions.push(version._id);
        }
        if (args.copyRecord) {
            const targetRecord = new Record({
                form: args.form,
                createdAt: new Date(),
                modifiedAt: new Date(),
                data: data,
                resource: oldForm.resource,
                versions: oldVersions
            });
            return targetRecord.save();
        } else {
            const update: any = {
                form: args.form,
                modifiedAt: new Date()
            };
            Object.assign(update,
                ignoredFields && { data: data },
                ignoredFields && { versions: oldVersions }
            );
            return Record.findByIdAndUpdate(
                args.id,
                update,
                { new: true }
            );
        }
    },
}