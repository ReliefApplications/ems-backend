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

/** Arguments for the editUniquenessRule mutation */
type EditUniquenessRuleArgs = {
  resource: string | Types.ObjectId;
  id: string | Types.ObjectId;
  rule: UniquenessRuleArgs;
};

/**
 * Edit an existing uniqueness rule of a resource. The rule is replaced by the
 * one provided: options which are not set are removed from it.
 * Throw an error if user not connected, or not allowed to update the resource.
 */
export default {
  type: UniquenessRuleType,
  args: {
    resource: { type: new GraphQLNonNull(GraphQLID) },
    id: { type: new GraphQLNonNull(GraphQLID) },
    rule: { type: new GraphQLNonNull(UniquenessRuleInputType) },
  },
  async resolve(parent, args: EditUniquenessRuleArgs, context: Context) {
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
      if (getUnknownRuleField(args.rule, resource)) {
        throw new GraphQLError(
          context.i18next.t('mutations.resource.edit.errors.field.notFound')
        );
      }
      rule.overwrite(args.rule);
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
