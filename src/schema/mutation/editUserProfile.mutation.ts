import { GraphQLNonNull, GraphQLError, GraphQLID } from 'graphql';
import { User } from '@models';
import { UserProfileArgs, UserProfileInputType } from '../inputs';
import { UserType } from '../types';
import { AppAbility } from '@security/defineUserAbility';
import config from 'config';
import { isEmpty, get } from 'lodash';
import { logger } from '@lib/logger';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

/** Arguments for the editUserProfile mutation */
type EditUserProfileArgs = {
  profile: UserProfileArgs;
  id?: string | Types.ObjectId;
};

/**
 * Edit User profile.
 * If a user ID is used as argument, the profile of the user corresponding to the id will be updated, if current user has permission to do so.
 * Otherwise, profile of current user will be updated.
 */
export default {
  type: UserType,
  args: {
    profile: { type: new GraphQLNonNull(UserProfileInputType) },
    id: { type: GraphQLID },
  },
  async resolve(parent, args: EditUserProfileArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      const availableAttributes: { value: string; text: string }[] =
        config.get('user.attributes.list') || [];

      // Create base update
      const update = {};
      Object.assign(
        update,
        args.profile.favoriteApp && { favoriteApp: args.profile.favoriteApp },
        args.profile.name && { name: args.profile.name },
        args.profile.firstName && { firstName: args.profile.firstName },
        args.profile.lastName && { lastName: args.profile.lastName }
      );

      // Create attribute update
      const attributes = {};
      if (args.profile.attributes) {
        for (const attribute in args.profile.attributes) {
          if (availableAttributes.find((x) => x.value === attribute)) {
            Object.assign(attributes, {
              [attribute]: get(args.profile.attributes, attribute, null),
            });
          }
        }
      }

      if (!isEmpty(attributes)) {
        Object.assign(update, { attributes });
      }

      if (args.id) {
        const ability: AppAbility = context.user.ability;
        if (ability.can('update', 'User')) {
          try {
            return await User.findByIdAndUpdate(args.id, update, { new: true });
          } catch {
            throw new GraphQLError(
              context.i18next.t('common.errors.dataNotFound')
            );
          }
        } else {
          throw new GraphQLError(
            context.i18next.t('common.errors.permissionNotGranted')
          );
        }
      } else {
        return await User.findByIdAndUpdate(user._id, update, { new: true });
      }
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      if (err instanceof GraphQLError) {
        throw new GraphQLError(err.message);
      }
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
