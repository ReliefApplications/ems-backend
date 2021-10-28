import { GraphQLError, GraphQLNonNull } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { Form, Record } from '../../models';
import errors from '../../const/errors';
import { AppAbility } from '../../security/defineAbilityFor';
import { getFormPermissionFilter } from '../../utils/filter';
import { EJSON } from 'bson';

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
        if (ability.can('read', 'Record')) {
            const pipeline: any = EJSON.deserialize(args.pipeline);
            pipeline.unshift({ $match: { archived: { $ne: true } } });
            return Record.aggregate(pipeline);
        } else {
            const allFormPermissionsFilters = [];
            const forms = await Form.find({}).select('_id permissions');
            for (const form of forms) {
                if (form.permissions.canSeeRecords.length > 0) {
                    const permissionFilters = getFormPermissionFilter(user, form, 'canSeeRecords');
                    if (permissionFilters.length > 0) {
                        allFormPermissionsFilters.push({ $and: [ { form: form._id }, { $or: permissionFilters } ] });
                    }
                } else {
                    allFormPermissionsFilters.push({ form: form._id });
                }
            }
            const pipeline: any = EJSON.deserialize(args.pipeline);
            pipeline.unshift({ $match: { $or: allFormPermissionsFilters, archived: { $ne: true } } });
            return Record.aggregate(pipeline);
        }
    }
};
