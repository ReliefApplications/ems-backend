import { GraphQLID, GraphQLNonNull, GraphQLError } from 'graphql';
import { AppAbility } from '@security/defineUserAbility';
import { PageType } from '../types';
import { Application, Page, Role, Step, Workflow } from '@models';
import { duplicatePage } from '../../services/page.service';
import { logger } from '@lib/logger';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

/** Arguments for the duplicatePage mutation */
type DuplicatePageArgs = {
  page?: string | Types.ObjectId;
  step?: string | Types.ObjectId;
  application: string | Types.ObjectId;
};

/**
 * Duplicate existing page in a new application.
 * Page can be Workflow or Dashboard.
 * Throw an error if not logged or authorized, or arguments are invalid.
 */
export default {
  type: PageType,
  args: {
    page: { type: GraphQLID },
    step: { type: GraphQLID },
    application: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args: DuplicatePageArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      // Check ability
      const user = context.user;
      const ability: AppAbility = user.ability;
      // Check parameters
      if (!args.page && !args.step) {
        throw new GraphQLError(
          context.i18next.t(
            'mutations.application.content.duplicate.errors.missingArguments'
          )
        );
      }
      if (args.page && args.step) {
        throw new GraphQLError(
          context.i18next.t(
            'mutations.application.content.duplicate.errors.incompatibleArguments'
          )
        );
      }
      // Find application
      const application = await Application.findById(args.application);
      if (!application)
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      // Check access to the application
      if (ability.can('read', application)) {
        if (args.page) {
          // If page
          const page = await Page.findById(args.page);
          if (!page) throw new GraphQLError('common.errors.dataNotFound');
          const pageApplication = await Application.findOne({
            pages: { $in: [args.page] },
          });
          if (!pageApplication)
            throw new GraphQLError('common.errors.dataNotFound');
          if (ability.can('update', pageApplication)) {
            // Get list of roles for default permissions
            const roles = await Role.find({ application: application._id });
            const permissions = {
              canSee: roles.map((x) => x.id),
              canUpdate: [],
              canDelete: [],
            };
            // Create the new page and set the permissions
            const newPage = await duplicatePage(
              page,
              `${page.name} Copy`,
              permissions
            );
            const update = {
              $push: { pages: newPage.id },
            };
            await Application.findByIdAndUpdate(args.application, update);
            return newPage;
          }
        } else {
          // If step
          const step = await Step.findById(args.step);
          if (!step) throw new GraphQLError('common.errors.dataNotFound');
          const workflow = await Workflow.findOne({
            steps: { $in: [args.step] },
          });
          if (!workflow) throw new GraphQLError('common.errors.dataNotFound');
          const page = await Page.findOne({
            content: workflow._id,
          });
          if (!page) throw new GraphQLError('common.errors.dataNotFound');
          const stepApplication = await Application.findOne({
            pages: { $in: [page._id] },
          });
          if (!stepApplication)
            throw new GraphQLError('common.errors.dataNotFound');
          if (ability.can('update', stepApplication)) {
            // Get list of roles for default permissions
            const roles = await Role.find({ application: application._id });
            const permissions = {
              canSee: roles.map((x) => x.id),
              canUpdate: [],
              canDelete: [],
            };
            // Create the new page and set the permissions
            const newPage = await duplicatePage(
              new Page(step),
              `${step.name} Copy`,
              permissions
            );
            const update = {
              $push: { pages: newPage.id },
            };
            await Application.findByIdAndUpdate(args.application, update);
            return newPage;
          }
        }
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
