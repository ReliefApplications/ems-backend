import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import { logger } from '@services/logger.service';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';
import { EmailDistributionListType } from '@schema/types/emailDistribution.type';
import GraphQLJSON from 'graphql-type-json';
import { EmailDistributionList } from '@models';

/**
 * Mutation to add a new distribution list.
 */
export default {
  type: EmailDistributionListType,
  args: {
    distributionList: { type: new GraphQLNonNull(GraphQLJSON) },
    applicationId: { type: GraphQLID },
  },
  async resolve(_, args, context: Context) {
    graphQLAuthCheck(context);
    try {
      const update = {
        distributionListName: args.distributionList.distributionListName,
        To: args.distributionList.To,
        Bcc: args.distributionList.Bcc,
        Cc: args.distributionList.Cc,
        createdBy: { name: context.user.name, email: context.user.username },
        ...(args.applicationId && { applicationId: args.applicationId }),
      };

      const distributionList = new EmailDistributionList(update);
      await distributionList.save();
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
