import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLString,
  GraphQLList,
  GraphQLError,
} from 'graphql';
import { WorkflowType } from '../types';
import { Workflow, Page, Step } from '@models';
import extendAbilityForContent from '@security/extendAbilityForContent';
import { logger } from '@lib/logger';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

/** Arguments for the editWorkflow mutation */
type EditWorkflowArgs = {
  id: string | Types.ObjectId;
  name?: string;
  steps?: string[] | Types.ObjectId[];
};

/**
 * Find a workflow from its id and update it, if user is authorized.
 * Throw an error if not logged or authorized, or arguments are invalid.
 */
export default {
  type: WorkflowType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    name: { type: GraphQLString },
    steps: { type: new GraphQLList(GraphQLID) },
  },
  async resolve(parent, args: EditWorkflowArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      // check inputs
      if (!args || (!args.name && !args.steps)) {
        throw new GraphQLError(
          context.i18next.t('mutations.workflow.edit.errors.invalidArguments')
        );
      }

      // get data and check permissions
      let workflow = await Workflow.findById(args.id);
      const ability = await extendAbilityForContent(user, workflow);
      if (ability.cannot('update', workflow)) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }

      // do the update
      const update = Object.assign(
        {},
        args.name && { name: args.name },
        args.steps && { steps: args.steps }
      );
      workflow = await Workflow.findByIdAndUpdate(args.id, update, {
        new: true,
      });

      // update the page or step
      if (update.steps) delete update.steps;
      await Page.findOneAndUpdate({ content: args.id }, update);
      await Step.findOneAndUpdate({ content: args.id }, update);

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
