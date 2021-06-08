import { GraphQLObjectType, GraphQLID, GraphQLString } from 'graphql';
import { Application } from '../../models';
import { ApplicationType } from './application';

export const PositionAttributeCategoryType = new GraphQLObjectType({
    name: 'PositionAttributeCategory',
    fields: () => ({
        id: { type: GraphQLID },
        title: { type: GraphQLString },
        application: {
            type: ApplicationType,
            resolve(parent) {
                return Application.findOne( { _id: parent.application } );
            }
        }
    })
});