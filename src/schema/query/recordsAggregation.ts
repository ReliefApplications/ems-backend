import { GraphQLError, GraphQLNonNull } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { Form, Record } from '../../models';
import errors from '../../const/errors';
import { AppAbility } from '../../security/defineAbilityFor';
import getPermissionFilters from '../../utils/getPermissionFilters';

export default {
    /* Take an aggregation configuration as parameter.
        Returns aggregated records data.
    */
    type: GraphQLJSON,
    args: {
        pipeline: { type: new GraphQLNonNull(GraphQLJSON) },
    },
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        const ability: AppAbility = context.user.ability;
        if (!user) {
            throw new GraphQLError(errors.userNotLogged);
        }
        
        // Check against records permissions if needed
        // /!\/!\/!\ Removed EJSON.deserialize because it wouldn't work with it. /!\/!\/!\
        if (ability.can('read', 'Record')) {
            //const pipeline = EJSON.deserialize(args.pipeline);
            return Record.aggregate(args.pipeline);
        } else {
            const allFormPermissionsFilters = [];
            const forms = await Form.find({}).select('_id permissions');
            for (const form of forms) {
                if (form.permissions.canSeeRecords.length > 0) {
                    const permissionFilters = getPermissionFilters(user, form, 'canSeeRecords');
                    if (permissionFilters.length > 0) {
                        allFormPermissionsFilters.push({ $and: [ { form: form._id }, { $or: permissionFilters } ] });
                    }
                } else {
                    allFormPermissionsFilters.push({ form: form._id });
                }
            }
            //const pipeline = EJSON.deserialize([{ $match: { $or: allFormPermissionsFilters } }, ...args.pipeline]);
            return Record.aggregate([{ $match: { $or: allFormPermissionsFilters } }, ...args.pipeline]);
        }
    }
}
