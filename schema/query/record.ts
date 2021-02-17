import { GraphQLNonNull, GraphQLID, GraphQLError } from "graphql";
import errors from "../../const/errors";
import { Record } from "../../models";
import { RecordType } from "../types";
import { AppAbility } from "../../security/defineAbilityFor";

export default {
    /*  Returns record from id if available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: RecordType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
    },
    async resolve(parent, context, args) {
        let record = null;
        const ability: AppAbility = context.user.ability;
        const filters = Record.accessibleBy(ability, 'read').where({_id: args.id}).getFilter();
        record = await Record.findOne(filters);
        if (!record) {
            throw new GraphQLError(errors.permissionNotGranted);
        }
        return record;
    },
}