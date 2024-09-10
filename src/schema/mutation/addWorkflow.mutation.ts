import {
  GraphQLString,
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
} from 'graphql';
import { contentType } from '@const/enumTypes';
import { Page, Workflow } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { WorkflowType } from '../types';
import { logger } from '@lib/logger';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

/** Arguments for the addWorkflow mutation */
type AddWorkflowArgs = {
  name?: string;
  page: string | Types.ObjectId;
};

/**
 * Creates a new workflow linked to an existing page.
 * Throws an error if not logged or authorized, or arguments are invalid.
 * NEVER USED IN THE FRONT END AT THE MOMENT
 */
export default {
  type: WorkflowType,
  args: {
    name: { type: GraphQLString },
    page: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args: AddWorkflowArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      if (!args.page) {
        throw new GraphQLError(
          context.i18next.t('mutations.workflow.add.errors.invalidArguments')
        );
      } else {
        const user = context.user;
        const ability: AppAbility = user.ability;
        if (ability.can('create', 'Workflow')) {
          const page = await Page.findById(args.page);
          if (!page)
            throw new GraphQLError(
              context.i18next.t('common.errors.dataNotFound')
            );
          if (page.type !== contentType.workflow)
            throw new GraphQLError(
              context.i18next.t('mutations.workflow.add.errors.pageTypeError')
            );
          // Create a workflow.
          const workflow = new Workflow({
            name: args.name,
            //createdAt: new Date(),
          });
          await workflow.save();
          // Link the new workflow to the corresponding page by updating this page.
          const update = {
            //modifiedAt: new Date(),
            content: workflow._id,
          };
          await Page.findByIdAndUpdate(args.page, update);
          return workflow;
        } else {
          throw new GraphQLError(
            context.i18next.t('common.errors.permissionNotGranted')
          );
        }
      }
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
