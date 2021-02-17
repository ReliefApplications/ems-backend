import { GraphQLList } from "graphql";
import { Record } from "../../models";
import { RecordType } from "../types";
import { AppAbility } from "../../security/defineAbilityFor";

export default {
    /*  List all records available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: new GraphQLList(RecordType),
    resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return Record.find({}).accessibleBy(ability);
    },
}