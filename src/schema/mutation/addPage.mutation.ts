import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { ContentType, contentType } from '@const/enumTypes';
import { Application, Workflow, Dashboard, Form, Page, Role } from '@models';
import { PageType } from '../types';
import { ContentEnumType } from '@const/enumTypes';
import extendAbilityForPage from '@security/extendAbilityForPage';
import { logger } from '@lib/logger';
import GraphQLJSON from 'graphql-type-json';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

/** Arguments for the addDashboard mutation */
type AddPageArgs = {
  type: ContentType;
  content?: string | Types.ObjectId;
  application: string | Types.ObjectId;
  duplicate?: string | Types.ObjectId;
  structure?: any;
};

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
    structure: { type: GraphQLJSON },
  },
  async resolve(parent, args: AddPageArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      // check user
      const user = context.user;
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
          });
          await workflow.save();
          content = workflow._id;
          break;
        }
        case contentType.dashboard: {
          pageName = 'Dashboard';
          const dashboard = new Dashboard({
            name: pageName,
            ...(args.structure && { structure: args.structure }),
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
        $push: { pages: page.id },
      };
      await application.updateOne(update);
      return page;
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
