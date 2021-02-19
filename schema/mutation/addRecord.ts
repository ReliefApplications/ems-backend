import { GraphQLID, GraphQLNonNull, GraphQLError } from "graphql";
import GraphQLJSON from "graphql-type-json";
import errors from "../../const/errors";
import { RecordType } from "../types";
import { Form, Record } from "../../models";
import transformRecord from "../../utils/transformRecord";
import { AppAbility } from "../../security/defineAbilityFor";
export default {
    /*  Adds a record to a form, if user authorized.
        Throws a GraphQL error if not logged or authorized, or form not found.
        TODO: we have to check form by form for that.
    */
    type: RecordType,
    args: {
        form: { type: GraphQLID },
        data: { type: new GraphQLNonNull(GraphQLJSON) },
    },
    async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        if (ability.can('create', 'Record')) {
            const form = await Form.findById(args.form);
            if (!form) throw new GraphQLError(errors.dataNotFound);
            transformRecord(args.data, form.fields);
            const record = new Record({
                form: args.form,
                createdAt: new Date(),
                modifiedAt: new Date(),
                data: args.data,
                resource: form.resource ? form.resource : null,
            });
            await record.save();
            return record;
        } else {
            throw new GraphQLError(errors.permissionNotGranted);
        }
    },
}