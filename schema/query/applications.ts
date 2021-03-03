import { GraphQLError, GraphQLList } from "graphql";
import { ApplicationType } from "../types";
import { Application, Form } from "../../models";
import errors from "../../const/errors";
import { AppAbility } from "../../security/defineAbilityFor";
import mongoose from 'mongoose';

export default {
    /*  List all applications available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: new GraphQLList(ApplicationType),
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }
        const form = await Form.findByIdAndUpdate(mongoose.Types.ObjectId("601bbb7de04201001e9ed1c1"), {
            "permissions.canCreateRecords": ["60390bf5a12fbb0240ded4f9", "60390c10a12fbb0240ded4fb"],
            "permissions.canDeleteRecords": [
                {
                    "role": "60390bf5a12fbb0240ded4f9"
                }
            ],
            "permissions.canUpdateRecords": [
                {
                    "role": "60390bf5a12fbb0240ded4f9"
                },
                {
                    "role": "60390c10a12fbb0240ded4fb",
                    "access":{
                        "condition":"and",
                        "rules":[
                            {
                                "field":"createdBy.positionAttributes",
                                "operator":"match",
                                "value": JSON.stringify(
                                    {
                                        "value": "$$own.positionAttributes.$$where:category:6034e020bcffc3001f7003b0.value",
                                        "category": "6034e020bcffc3001f7003b0"
                                    })
                            },
                            {
                                "field":"createdBy.positionAttributes",
                                "operator":"match",
                                "value": JSON.stringify(
                                    {
                                        "value": "$$own.positionAttributes.$$where:category:6038d43ddef7330208cdb324.value",
                                        "category": "6038d43ddef7330208cdb324"
                                    })
                            }
                        ]
                    }
                }
            ],
            "permissions.canSeeRecords": [
                {
                    "role": "60390bf5a12fbb0240ded4f9"
                },
                {
                    "role": "60390c0aa12fbb0240ded4fa",
                    "access":{
                        "condition":"and",
                        "rules":[
                            {
                                "field":"createdBy.positionAttributes",
                                "operator":"match",
                                "value": JSON.stringify(
                                    {
                                        "value": "$$own.positionAttributes.$$where:category:6034e020bcffc3001f7003b0.value",
                                        "category": "6034e020bcffc3001f7003b0"
                                    })
                            }
                        ]
                    }
                },
                {
                    "role": "60390c10a12fbb0240ded4fb",
                    "access":{
                        "condition":"and",
                        "rules":[
                            {
                                "field":"createdBy.positionAttributes",
                                "operator":"match",
                                "value": JSON.stringify(
                                    {
                                        "value": "$$own.positionAttributes.$$where:category:6034e020bcffc3001f7003b0.value",
                                        "category": "6034e020bcffc3001f7003b0"
                                    })
                            },
                            {
                                "field":"createdBy.positionAttributes",
                                "operator":"match",
                                "value": JSON.stringify(
                                    {
                                        "value": "$$own.positionAttributes.$$where:category:6038d43ddef7330208cdb324.value",
                                        "category": "6038d43ddef7330208cdb324"
                                    })
                            }
                        ]
                    }
                }
            ]
        });
        const ability: AppAbility = context.user.ability;
        return Application.find({}).accessibleBy(ability);
    }
}