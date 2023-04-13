import { GraphQLObjectType, GraphQLID, GraphQLString, GraphQLError } from 'graphql';
import { AppAbility } from '@security/defineUserAbility';
import GraphQLJSON from 'graphql-type-json';
import { UserType } from '../types';
import { User } from '@models';

/** GraphQL Version type definition */
export const VersionType = new GraphQLObjectType({
  name: 'Version',
  fields: () => ({
    id: {
      type: GraphQLID,
      resolve(parent) {
        return parent._id;
      },
    },
    createdAt: { type: GraphQLString },
    data: { type: GraphQLJSON },
    createdBy: {
      type: UserType,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        const user = User.findById(parent.createdBy).accessibleBy(ability, 'read');
        if (!user){
          throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
        }
        return user;
      },
    },
  }),
});
