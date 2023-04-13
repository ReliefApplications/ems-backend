import { GraphQLObjectType, GraphQLID, GraphQLString, GraphQLError } from 'graphql';
import { AppAbility } from '@security/defineUserAbility';
import { Application } from '@models';
import { ApplicationType } from './application.type';

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
        const application = Application.findById(parent.application).accessibleBy(
          ability,
          'read'
        );
        if (!application){
          throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
        }
        return application;
      },
    },
  }),
});
