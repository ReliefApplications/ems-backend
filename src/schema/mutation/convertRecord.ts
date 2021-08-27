import { GraphQLNonNull, GraphQLID, GraphQLError, GraphQLBoolean } from 'graphql';
import errors from '../../const/errors';
import { Form, Record } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import { RecordType } from '../types';

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
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }

        const ability: AppAbility = context.user.ability;
        if (!ability.can('update', 'Record')) { throw new GraphQLError(errors.permissionNotGranted); }

        const oldRecord = await Record.findById(args.id);
        const oldForm = await Form.findById(oldRecord.form);
        const targetForm = await Form.findById(args.form);
        if (!oldForm.resource.equals(targetForm.resource)) throw new GraphQLError(errors.invalidConversion);
        const data = oldRecord.data;
        const oldVersions = oldRecord.versions;
        if (args.copyRecord) {
            const targetRecord = new Record({
                form: args.form,
                createdAt: new Date(),
                modifiedAt: new Date(),
                data,
                resource: oldForm.resource,
                versions: oldVersions
            });
            return targetRecord.save();
        } else {
            const update: any = {
                form: args.form,
                modifiedAt: new Date()
            };
            return Record.findByIdAndUpdate(
                args.id,
                update,
                { new: true }
            );
        }
    },
}
