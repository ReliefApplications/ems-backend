import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import { Resource } from '@models';
import { UniquenessRuleType } from '../types';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@services/logger.service';
import { accessibleBy } from '@casl/mongoose';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';
import { getErrorMessage, getErrorStack } from '@utils/error';

/** Arguments for the deleteUniquenessRule mutation */
type DeleteUniquenessRuleArgs = {
  resource: string | Types.ObjectId;
  id: string | Types.ObjectId;
};

/**
 * Delete an existing uniqueness rule of a resource.
 * Throw an error if user not connected, or not allowed to update the resource.
 */
export default {
  type: UniquenessRuleType,
  args: {
    resource: { type: new GraphQLNonNull(GraphQLID) },
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args: DeleteUniquenessRuleArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const ability: AppAbility = context.user.ability;
      const filters = Resource.find(accessibleBy(ability, 'update').Resource)
        .where({ _id: args.resource })
        .getFilter();
      const resource: Resource = await Resource.findOne(filters);
      if (!resource) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }
      const rule = (resource.uniquenessRules as Types.DocumentArray<any>).id(
        args.id
      );
      if (!rule) {
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      }
      rule.deleteOne();
      await resource.save();
      return rule;
    } catch (err) {
      logger.error(getErrorMessage(err), { stack: getErrorStack(err) });
      if (err instanceof GraphQLError) {
        throw new GraphQLError(err.message);
      }
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
