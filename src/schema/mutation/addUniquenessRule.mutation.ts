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
import { UniquenessRuleInputType, UniquenessRuleArgs } from '../inputs';
import { getUnknownRuleField } from '@utils/form';

/** Arguments for the addUniquenessRule mutation */
type AddUniquenessRuleArgs = {
  resource: string | Types.ObjectId;
  rule: UniquenessRuleArgs;
};

/**
 * Add a new uniqueness rule to a resource.
 * Throw an error if user not connected, or not allowed to update the resource.
 */
export default {
  type: UniquenessRuleType,
  args: {
    resource: { type: new GraphQLNonNull(GraphQLID) },
    rule: { type: new GraphQLNonNull(UniquenessRuleInputType) },
  },
  async resolve(parent, args: AddUniquenessRuleArgs, context: Context) {
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
      if (getUnknownRuleField(args.rule, resource)) {
        throw new GraphQLError(
          context.i18next.t('mutations.resource.edit.errors.field.notFound')
        );
      }
      resource.uniquenessRules.push(args.rule);
      await resource.save();
      return resource.uniquenessRules[resource.uniquenessRules.length - 1];
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
