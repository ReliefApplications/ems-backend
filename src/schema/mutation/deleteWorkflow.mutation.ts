import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { WorkflowType } from '../types';
import { Workflow, Page, Step } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@lib/logger';
import { accessibleBy } from '@casl/mongoose';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

/** Arguments for the deleteWorkflow mutation */
type DeleteWorkflowArgs = {
  id: string | Types.ObjectId;
};

/**
 * Delete a workflow from its id and recursively delete steps.
 * Throws an error if not logged or authorized, or arguments are invalid.
 */
export default {
  type: WorkflowType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args: DeleteWorkflowArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const ability: AppAbility = context.user.ability;
      let workflow = null;
      if (ability.can('delete', 'Workflow')) {
        workflow = await Workflow.findByIdAndDelete(args.id);
      } else {
        const page = await Page.find({
          content: args.id,
          ...accessibleBy(ability, 'delete').Page,
        });
        const step = await Step.find({
          content: args.id,
          ...accessibleBy(ability, 'delete').Step,
        });
        if (page || step) {
          workflow = await Workflow.findByIdAndDelete(args.id);
        }
      }
      if (!workflow)
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
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
