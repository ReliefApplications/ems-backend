import { GraphQLList, GraphQLError } from "graphql";
import errors from "../../const/errors";
import permissions from "../../const/permissions";
import { Workflow } from "../../models";
import { WorkflowType } from "../types";
import { AppAbility } from "../../security/defineAbilityFor";

export default {
    /*  List all workflows available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: new GraphQLList(WorkflowType),
    resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return Workflow.find({}).accessibleBy(ability);
    }
}