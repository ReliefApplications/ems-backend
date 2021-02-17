import { GraphQLList } from "graphql";
import permissions from "../../const/permissions";
import checkPermission from "../../utils/checkPermission";
import { StepType } from "../types";
import mongoose from 'mongoose';
import { Step } from "../../models";
import { AppAbility } from "../../security/defineAbilityFor";

export default {
    /*  List all steps available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: new GraphQLList(StepType),
    resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return Step.find({}).accessibleBy(ability);
    }
}