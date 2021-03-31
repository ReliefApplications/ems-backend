import { GraphQLError, GraphQLList } from "graphql";
import { ApplicationType } from "../types";
import { Application, Form } from "../../models";
import errors from "../../const/errors";
import { AppAbility } from "../../security/defineAbilityFor";
import mongoose from 'mongoose';export default {
    /*  List all applications available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: new GraphQLList(ApplicationType),
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }
        const form = await Form.findByIdAndUpdate(mongoose.Types.ObjectId("604b815624c59a0088a4c027"), {
            "permissions.recordsUnicity" : {
                "condition":"and",
                "rules":[
                    {
                        "field":"createdBy.positionAttributes",
                        "operator":"match",
                        "value": JSON.stringify(
                            {
                                "value": "$$own.positionAttributes.$$where:category:60587e4f0a618f001de54ba9.value",
                                "category": "60587e4f0a618f001de54ba9"
                            })
                    }
                ]
            }
        });
        const ability: AppAbility = context.user.ability;
        return Application.find({}).accessibleBy(ability);
    }
}
