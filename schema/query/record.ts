import { GraphQLNonNull, GraphQLID, GraphQLError } from "graphql";
import errors from "../../const/errors";
import { Form, Record } from "../../models";
import { RecordType } from "../types";
import { AppAbility } from "../../security/defineAbilityFor";
import mongoose from 'mongoose';
import convertFilter from "../../utils/convertFilter";

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
            const roles = user.roles.map(x => mongoose.Types.ObjectId(x._id));
            const permissionFilters = [];
            form.permissions.canSeeRecords.forEach(x => {
                if ( !x.role || roles.some(role => role.equals(x.role))) {
                    const filter = {};
                    Object.assign(filter,
                        x.access && convertFilter(x.access, Record, user)
                    );
                    permissionFilters.push(filter);
                }
            });
            record = permissionFilters.length ? await Record.findOne({ $and: [ {_id: args.id }, { $or: permissionFilters }] }) : null;
            if (!record) {
                throw new GraphQLError(errors.permissionNotGranted);
            }
        }
        return record;
    }
}