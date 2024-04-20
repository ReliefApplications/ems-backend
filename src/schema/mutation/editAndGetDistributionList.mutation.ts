import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import { EmailDistributionList } from '@models';
import { logger } from '@services/logger.service';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';
import GraphQLJSON from 'graphql-type-json';
import { EmailDistributionListType } from '@schema/types/emailDistribution.type';

/**
 * Mutation to update an existing custom notification.
 */
export default {
  type: EmailDistributionListType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    distributionList: { type: GraphQLJSON },
  },
  async resolve(_, args, context: Context) {
    try {
      graphQLAuthCheck(context);
      if (args.distributionList) {
        const updateFields = {
          distributionListName: args.distributionList.distributionListName,
          To: args.distributionList.To,
          Bcc: args.distributionList.Bcc,
          Cc: args.distributionList.Cc,
          isDeleted: args.distributionList.isDeleted,
        };

        const updatedData = await EmailDistributionList.findByIdAndUpdate(
          args.id,
          { $set: updateFields },
          { new: true } // Return the modified document
        );

        return updatedData;
      } else {
        const distributionList = await EmailDistributionList.findById(args.id);
        return distributionList;
      }
    } catch (err) {
      logger.error(err.message, { stack: err.stack });

      if (err instanceof GraphQLError) {
        throw err;
      }

      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
