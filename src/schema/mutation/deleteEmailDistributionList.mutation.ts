import { GraphQLError, GraphQLNonNull, GraphQLID } from 'graphql';
import { logger } from '@services/logger.service';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';
import { EmailDistributionList, EmailNotification } from '@models';
import { EmailDistributionListType } from '@schema/types/emailDistribution.type';
import extendAbilityForApplications from '@security/extendAbilityForApplication';
import { AppAbility } from '@security/defineUserAbility';

/**
 * Mutation to delete an existing distribution list.
 */
export default {
  type: EmailDistributionListType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(_, { id }, context: Context) {
    graphQLAuthCheck(context);

    try {
      const distributionList = await EmailDistributionList.findOne({
        _id: id,
        isDeleted: 0,
      });

      if (!distributionList) {
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      }

      const user = context.user;
      const ability: AppAbility = extendAbilityForApplications(
        user,
        distributionList.applicationId.toString()
      );

      if (ability.cannot('delete', 'DistributionList')) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }

      // Unset the reference in any EmailNotifications using this distribution list
      await EmailNotification.updateMany(
        { emailDistributionList: distributionList._id },
        { $unset: { emailDistributionList: 1 } }
      );

      // Delete DL
      await distributionList.deleteOne();

      return distributionList;
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
