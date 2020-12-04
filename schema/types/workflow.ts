import { GraphQLObjectType, GraphQLID, GraphQLString, GraphQLList } from "graphql";
import { Step, Page } from "../../models";
import { AccessType, PageType } from "../types";
import { StepType } from ".";

export const WorkflowType = new GraphQLObjectType({
    name: 'Workflow',
    fields: () => ({
        id: { type: GraphQLID },
        name: { type: GraphQLString },
        createdAt: { type: GraphQLString },
        modifiedAt: { type: GraphQLString },
        steps: {
            type: new GraphQLList(StepType),
            async resolve(parent, args) {
                const steps = await Step.aggregate([
                    { '$match' : { '_id' : { '$in' : parent.steps } } },
                    { '$addFields' : { '__order' : { '$indexOfArray': [ parent.steps, '$_id' ] } } },
                    { '$sort' : { '__order' : 1 } }
                ]);
                return steps;
            }
        },
        permissions: {
            type: AccessType,
            async resolve(parent, args) {
                const page = await Page.findOne({ content: parent.id })
                return page.permissions;
            }
        },
        page: {
            type: PageType,
            resolve(parent, args) {
                return Page.findOne({ content: parent.id });
            }
        }
    })
});