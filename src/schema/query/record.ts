import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import errors from '../../const/errors';
import { Record } from '../../models';
import { RecordType } from '../types';
import { AppAbility } from '../../security/defineAbilityFor';
import getPermissionFilters from '../../utils/getPermissionFilters';

export default {
    /*  Returns record from id if available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: RecordType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
    },
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }

        // Check ability
        const ability: AppAbility = context.user.ability;
        const filters = Record.accessibleBy(ability, 'read').where({_id: args.id}).getFilter();
        let record = await Record.findOne(filters);

        // Check the second layer of permissions
        if (!record) {
            const form = (await Record.findOne({ _id: args.id }, { form: true }).populate({ path: 'form', model: 'Form' })).form;
            const permissionFilters = getPermissionFilters(user, form, 'canSeeRecords');
            record = permissionFilters.length > 0 ? await Record.findOne({ $and: [ {_id: args.id }, { $or: permissionFilters }] })
            : form.permissions.canSeeRecords.length > 0 ? null : await Record.findById(args.id);
            if (!record) {
                throw new GraphQLError(errors.permissionNotGranted);
            }
        }
        return record;
    }
}