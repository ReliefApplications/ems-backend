import { GraphQLID, GraphQLNonNull, GraphQLError } from 'graphql';
import { AppAbility } from '@security/defineUserAbility';
import { PageType } from '../types';
import { Application, Page, Role, Step } from '@models';
import { duplicatePage } from '../../services/page.service';

/**
 * Duplicate existing page in a new application.
 * Page can be Workflow, Dashboard or a Dashboard that is a step in a Workflow.
 * Throw an error if not logged or authorized, or arguments are invalid.
 */
export default {
  type: PageType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    application: { type: new GraphQLNonNull(GraphQLID) },
    baseApplication: { type: GraphQLID },
  },
  async resolve(parent, args, context) {
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }
    const ability: AppAbility = user.ability;
    const application = await Application.findById(args.application);
    if (!application)
      throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));

    // Check access to the application
    if (ability.can('update', application)) {
      const page = await Page.findById(args.id);
      let pageApplication: Application;

      // If isn't a Page, but a Dashboard that is a step in a Workflow Page
      let step: Step;
      if (!page) {
        // Find step and source Application using the baseApplication param
        step = await Step.findById(args.id);
        pageApplication = await Application.findById(args.baseApplication);
      } else {
        // But if is a Page, gets the source Application using the Page
        pageApplication = await Application.findOne({
          pages: { $in: [args.id] },
        });
      }
      if (ability.can('update', pageApplication)) {
        // Get list of roles for default permissions
        const roles = await Role.find({ application: application._id });
        const permissions = {
          canSee: roles.map((x) => x.id),
          canUpdate: [],
          canDelete: [],
        };
        const toDuplicate = page ?? {
          content: step.content,
          name: step.name,
          type: step.type,
        };
        // Create the new page and set the permissions
        const newPage = await duplicatePage(
          toDuplicate,
          `${toDuplicate.name} Copy`,
          permissions
        );
        const update = {
          //modifiedAt: new Date(),
          $push: { pages: newPage.id },
        };
        await Application.findByIdAndUpdate(args.application, update);
        return newPage;
      }
    } else {
      throw new GraphQLError(
        context.i18next.t('common.errors.permissionNotGranted')
      );
    }
  },
};
