import {
  GraphQLBoolean,
  GraphQLID,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql';
import { UserType } from './user.type';
import { AppAbility } from '@security/defineUserAbility';
import { User } from '@models';
import { accessibleBy } from '@casl/mongoose';

/**
 * GraphQL Comment type.
 */
export const CommentType = new GraphQLObjectType({
  name: 'Comment',
  fields: () => ({
    id: {
      type: GraphQLID,
      resolve(parent) {
        return parent._id ? parent._id : parent.id;
      },
    },
    createdAt: { type: GraphQLString },
    modifiedAt: { type: GraphQLString },
    message: { type: GraphQLString },
    record: {
      type: GraphQLID,
    },
    resolved: { type: GraphQLBoolean },
    questionId: { type: GraphQLString },
    createdBy: {
      type: UserType,
      async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        const user = await User.findOne({
          _id: parent.createdBy.user,
          ...accessibleBy(ability, 'read').User,
        });
        return user;
      },
    },
  }),
});
