import { GraphQLObjectType, GraphQLID, GraphQLString } from 'graphql';
import { AppAbility } from '@security/defineUserAbility';
import { Application } from '@models';
import { ApplicationType } from './application.type';
import { accessibleBy } from '@casl/mongoose';

/** GraphQL position attribute category type definition */
export const PositionAttributeCategoryType = new GraphQLObjectType({
  name: 'PositionAttributeCategory',
  fields: () => ({
    id: { type: GraphQLID },
    title: { type: GraphQLString },
    application: {
      type: ApplicationType,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        const application = Application.findOne({
          _id: parent.application,
          ...accessibleBy(ability, 'read').Application,
        });
        return application;
      },
    },
  }),
});
