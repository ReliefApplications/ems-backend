import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { PageType } from '../types';
import {
  Application,
  Dashboard,
  Form,
  Page,
  Resource,
  Step,
  Workflow,
} from '@models';
import extendAbilityForPage from '@security/extendAbilityForPage';
import { logger } from '@services/logger.service';
import { statusType, contentType } from '@const/enumTypes';

/**
 * Delete a page from its id and erase its reference in the corresponding application.
 * Also delete recursively the linked Workflow or Dashboard.
 * Throws an error if not logged or authorized, or arguments are invalid.
 */
export default {
  type: PageType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    try {
      // Authentication check
      const user = context.user;
      if (!user)
        throw new GraphQLError(
          context.i18next.t('common.errors.userNotLogged')
        );

      // get data
      const page = await Page.findById(args.id);

      // get permissions
      const ability = await extendAbilityForPage(user, page);
      if (ability.cannot('delete', page)) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }

      // delete form
      if (!!page && page.type === contentType.form) {
        const form = await Form.findById(page.content);
        await Application.updateMany(
          { pages: args.id },
          { $pull: { pages: args.id } }
        );
        await Resource.deleteOne({ _id: form.resource });
        await form.deleteOne();
        return page;
      }

      // delete page
      if (!!page && page.status === statusType.archived) {
        await page.deleteOne();
        return page;
      } else {
        const dashboard = await Dashboard.findOne({ _id: page.content });
        if (!!dashboard) {
          await Dashboard.findByIdAndUpdate(
            dashboard._id,
            {
              $set: {
                status: statusType.archived,
              },
            },
            { new: true }
          );
        }
        const workflow = await Workflow.findOneAndUpdate(
          { _id: page.content },
          { $set: { status: statusType.archived } },
          { new: true }
        );
        if (!!workflow) {
          const stepData = await Step.find({ _id: { $in: workflow.steps } });
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
              }
              const dashboardRecord = await Dashboard.findOne({
                _id: items.content,
              });
              if (!!dashboardRecord) {
                await Dashboard.findByIdAndUpdate(
                  items.content,
                  {
                    $set: {
                      status: statusType.archived,
                    },
                  },
                  { new: true }
                );
              }
            });
          }
        }

        return await Page.findByIdAndUpdate(
          args.id,
          {
            $set: {
              status: statusType.archived,
            },
          },
          { new: true }
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
