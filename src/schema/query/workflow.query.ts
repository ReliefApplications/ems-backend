import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { WorkflowType } from '../types';
import mongoose from 'mongoose';
import { Workflow, Step } from '@models';
import extendAbilityForContent from '@security/extendAbilityForContent';
import { logger } from '@services/logger.service';
import { checkUserAuthenticated } from '@utils/schema';

/**
 * Returns workflow from id if available for the logged user.
 * Throw GraphQL error if not logged.
 */
export default {
  type: WorkflowType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    asRole: { type: GraphQLID },
  },
  async resolve(parent, args, context) {
    const user = context.user;
    checkUserAuthenticated(user);
    try {
      // get data and check permissions
      const workflow = await Workflow.findById(args.id);
      const ability = await extendAbilityForContent(user, workflow);
      if (ability.cannot('read', workflow)) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }

      if (args.asRole) {
        const steps = await Step.aggregate([
          {
            $match: {
              'permissions.canSee': {
                $elemMatch: { $eq: mongoose.Types.ObjectId(args.asRole) },
              },
              _id: { $in: workflow.steps },
            },
          },
          {
            $addFields: {
              __order: { $indexOfArray: [workflow.steps, '$_id'] },
            },
          },
          { $sort: { __order: 1 } },
        ]);
        workflow.steps = steps.map((x) => x._id);
      }

      return workflow;
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
