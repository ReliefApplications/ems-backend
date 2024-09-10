import {
  GraphQLString,
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
} from 'graphql';
import { contentType } from '@const/enumTypes';
import {
  Workflow,
  Dashboard,
  Step,
  Page,
  Application,
  Role,
  Form,
} from '@models';
import { StepType } from '../types';
import mongoose from 'mongoose';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@lib/logger';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';

/** Arguments for the addStep mutation */
type AddStepArgs = {
  type: string;
  content?: string | mongoose.Types.ObjectId;
  workflow: string | mongoose.Types.ObjectId;
};

/**
 * Creates a new step linked to an existing workflow.
 * Creates also the associated Dashboard if it's the step's type.
 * Throws an error if not logged or authorized, or arguments are invalid.
 */
export default {
  type: StepType,
  args: {
    type: { type: new GraphQLNonNull(GraphQLString) },
    content: { type: GraphQLID },
    workflow: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args: AddStepArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      const ability: AppAbility = user.ability;
      if (!args.workflow || !(args.type in contentType)) {
        throw new GraphQLError(
          context.i18next.t('mutations.step.add.errors.invalidArguments')
        );
      }
      const page = await Page.findOne({ content: args.workflow });
      if (!page) {
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      }
      const application = await Application.findOne({
        pages: { $elemMatch: { $eq: new mongoose.Types.ObjectId(page._id) } },
      });
      let stepName = '';
      if (ability.can('update', application)) {
        const workflow = await Workflow.findById(args.workflow);
        if (!workflow)
          throw new GraphQLError(
            context.i18next.t('common.errors.dataNotFound')
          );
        // Create a linked Dashboard if necessary
        if (args.type === contentType.dashboard) {
          stepName = 'Dashboard';
          const dashboard = new Dashboard({
            name: stepName,
            //createdAt: new Date(),
          });
          await dashboard.save();
          args.content = dashboard._id;
        } else {
          const form = await Form.findById(args.content);
          if (!form) {
            throw new GraphQLError(
              context.i18next.t('common.errors.dataNotFound')
            );
          }
          stepName = form.name;
        }
        // Create a new step.
        const roles = await Role.find({ application: application._id });
        const step = new Step({
          name: stepName,
          //createdAt: new Date(),
          type: args.type,
          content: args.content,
          permissions: {
            canSee: roles.map((x) => x.id),
            canUpdate: [],
            canDelete: [],
          },
        });
        await step.save();
        // Link the new step to the corresponding application by updating this application.
        const update = {
          //modifiedAt: new Date(),
          $push: { steps: step.id },
        };
        await Workflow.findByIdAndUpdate(args.workflow, update);
        return step;
      } else {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
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
