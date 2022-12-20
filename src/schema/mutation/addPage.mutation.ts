import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { contentType } from '@const/enumTypes';
import { Application, Workflow, Dashboard, Form, Page, Role } from '@models';
import { PageType } from '../types';
import { ContentEnumType } from '@const/enumTypes';
import extendAbilityForPage from '@security/extendAbilityForPage';

/**
 * Create a new page linked to an existing application.
 * Create also the linked Workflow or Dashboard. If it's a Form, the user must give its ID.
 * Throw an error if not logged or authorized, or arguments are invalid.
 */
export default {
  type: PageType,
  args: {
    type: { type: new GraphQLNonNull(ContentEnumType) },
    content: { type: GraphQLID },
    application: { type: new GraphQLNonNull(GraphQLID) },
    duplicate: { type: GraphQLID },
  },
  async resolve(parent, args, context) {
    // check user
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }
    // check inputs
    if (!args.application || !(args.type in contentType)) {
      throw new GraphQLError(
        context.i18next.t('mutations.page.add.errors.invalidArguments')
      );
    }
    // check data
    const application = await Application.findById(args.application);
    if (!application) {
      throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
    }
    // check permission
    const ability = await extendAbilityForPage(user, application);
    if (ability.cannot('create', 'Page')) {
      throw new GraphQLError(
        context.i18next.t('common.errors.permissionNotGranted')
      );
    }
    // Create the linked Workflow or Dashboard
    let pageName = '';
    let content = args.content;
    switch (args.type) {
      case contentType.workflow: {
        pageName = 'Workflow';
        const workflow = new Workflow({
          name: pageName,
          //createdAt: new Date(),
        });
        await workflow.save();
        content = workflow._id;
        break;
      }
      case contentType.dashboard: {
        pageName = 'Dashboard';
        const dashboard = new Dashboard({
          name: pageName,
          //createdAt: new Date(),
        });
        await dashboard.save();
        content = dashboard._id;
        break;
      }
      case contentType.form: {
        const form = await Form.findById(content);
        if (!form) {
          throw new GraphQLError(
            context.i18next.t('common.errors.dataNotFound')
          );
        }
        pageName = form.name;
        break;
      }
      default:
        break;
    }
    // Create a new page.
    const roles = await Role.find({ application: application._id });
    const page = new Page({
      name: pageName,
      //createdAt: new Date(),
      type: args.type,
      content,
      permissions: {
        canSee: roles.map((x) => x.id),
        canUpdate: [],
        canDelete: [],
      },
    });
    await page.save();
    // Link the new page to the corresponding application by updating this application.
    const update = {
      //modifiedAt: new Date(),
      $push: { pages: page.id },
    };
    await application.updateOne(update);
    return page;
  },
};
