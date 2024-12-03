import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import { EmailDistributionList } from '@models';
import { logger } from '@services/logger.service';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';
import GraphQLJSON from 'graphql-type-json';
import { EmailDistributionListType } from '@schema/types/emailDistribution.type';

/**
 * Mutation to update an existing distribution list.
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
      if (
        !args.distributionList.name ||
        (!(
          args.distributionList.to.resource ||
          args.distributionList.to.reference
        ) &&
          args.distributionList.to.inputEmails.length === 0)
      ) {
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      }
      if (args.distributionList) {
        const updateFields = {
          name: args.distributionList.name,
          to: args.distributionList.to,
          bcc: args.distributionList.bcc,
          cc: args.distributionList.cc,
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
      } else if (err?.code === 11000) {
        throw new GraphQLError(
          context.i18next.t(
            'mutations.emailDistributionList.errors.emailDistributionListNameExist'
          )
        );
      }

      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
