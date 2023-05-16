import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { WorkflowType } from '../types';
import { Workflow, Page, Step, Dashboard } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@services/logger.service';
import { statusType } from '@const/enumTypes';

/**
 * Delete a workflow from its id and recursively delete steps.
 * Throws an error if not logged or authorized, or arguments are invalid.
 */
export default {
  type: WorkflowType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    try {
      // Authentication check
      const user = context.user;
      if (!user) {
        throw new GraphQLError(
          context.i18next.t('common.errors.userNotLogged')
        );
      }

      const ability: AppAbility = context.user.ability;
      let workflow = null;
      const workflowData = await Workflow.findById(args.id);

      if (
        !!workflowData &&
        !!workflowData.status &&
        workflowData.status === statusType.archived
      ) {
        if (ability.can('delete', 'Workflow')) {
          workflow = await Workflow.findByIdAndDelete(args.id);
        } else {
          const page = await Page.accessibleBy(ability, 'delete').where({
            content: args.id,
          });
          const step = await Step.accessibleBy(ability, 'delete').where({
            content: args.id,
          });
          if (page || step) {
            workflow = await Workflow.findByIdAndDelete(args.id);
          }
        }
      } else {
        const stepData = await Step.find({ _id: { $in: workflowData.steps } });
        if (!!stepData) {
          stepData.map(async function (items) {
            if (!!items.status && items.status === statusType.active) {
              await Step.findByIdAndUpdate(
                items._id,
                {
                  $set: {
                    status: statusType.archived,
                  },
                },
                { new: true }
              );
              const dashboards = await Dashboard.findOne({
                _id: items.content,
              });
              if (!!dashboards) {
                await Dashboard.findByIdAndUpdate(
                  dashboards._id,
                  {
                    $set: {
                      status: statusType.archived,
                    },
                  },
                  { new: true }
                );
              }
            }
          });
        }
        workflow = await Workflow.findByIdAndUpdate(
          args.id,
          {
            $set: {
              status: statusType.archived,
            },
          },
          { new: true }
        );
      }
      if (!workflow)
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      return workflow;
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
