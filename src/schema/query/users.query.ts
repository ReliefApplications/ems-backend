import { GraphQLList, GraphQLError, GraphQLID } from 'graphql';
import { User } from '@models';
import { UserType } from '../types';
import { AppAbility } from '@security/defineUserAbility';
import { Types } from 'mongoose';
import { logger } from '@services/logger.service';
import { graphQLAuthCheck } from '@schema/shared';

/**
 * List back-office users if logged user has admin permission.
 * Throw GraphQL error if not logged or not authorized.
 */
export default {
  type: new GraphQLList(UserType),
  args: {
    applications: { type: new GraphQLList(GraphQLID) },
  },
  async resolve(parent, args, context) {
    graphQLAuthCheck(context);
    try {
      const ability: AppAbility = context.user.ability;
      if (ability.can('read', 'User')) {
        if (!args.applications) {
          const users = await User.find({}).populate({
            path: 'roles',
            model: 'Role',
            match: { application: { $eq: null } },
          });
          return users;
        } else {
          const aggregations = [
            // Left join
            {
              $lookup: {
                from: 'roles',
                localField: 'roles',
                foreignField: '_id',
                as: 'roles',
              },
            },
            // Replace the roles field with a filtered array, containing only roles that are part of the application(s).
            {
              $addFields: {
                roles: {
                  $filter: {
                    input: '$roles',
                    as: 'role',
                    cond: {
                      $in: [
                        '$$role.application',
                        args.applications.map((x) => new Types.ObjectId(x)),
                      ],
                    },
                  },
                },
              },
            },
            // Filter users that have at least one role in the application(s).
            { $match: { 'roles.0': { $exists: true } } },
          ];
          const aggregation = await User.aggregate(aggregations);
          return aggregation;
        }
      } else {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
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
