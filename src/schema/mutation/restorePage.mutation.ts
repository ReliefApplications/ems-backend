import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { PageType } from '../types';
import { Dashboard, Page, Workflow } from '@models';
import extendAbilityForPage from '@security/extendAbilityForPage';
import { logger } from '@services/logger.service';
import { statusType } from '@const/enumTypes';

/**
 * Restore a page from its id and erase its reference in the corresponding application.
 * Also restore recursively the linked Workflow or Dashboard.
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
      if (ability.cannot('update', page)) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }

      // restore page
      if (!!page && !!page.status && page.status === statusType.archived) {
        const dashboards = await Dashboard.findOne({ _id: page.content });
        if (!!dashboards) {
          await Dashboard.findByIdAndUpdate(
            dashboards._id,
            {
              $set: {
                status: statusType.active,
              },
            },
            { new: true }
          );
        }
        const workflows = await Workflow.findOne({ _id: page.content });
        if (!!workflows) {
          await Workflow.findByIdAndUpdate(
            workflows._id,
            {
              $set: {
                status: statusType.active,
              },
            },
            { new: true }
          );
          //   const stepData = await Step.find({ _id: { $in: workflows.steps } });
          //   if (!!stepData) {
          //     stepData.map(async function (items) {
          //       if (!!items.status && items.status === statusType.active) {
          //         await Step.findByIdAndUpdate(
          //           items._id,
          //           {
          //             $set: {
          //               status: statusType.archived,
          //             },
          //           },
          //           { new: true }
          //         );
          //       }
          //       const dashboardRecords = await Dashboard.findOne({
          //         _id: items.content,
          //       });
          //       if (!!dashboardRecords) {
          //         await Dashboard.findByIdAndUpdate(
          //           items.content,
          //           {
          //             $set: {
          //               status: statusType.archived,
          //             },
          //           },
          //           { new: true }
          //         );
          //       }
          //     });
          //   }
        }
        return await Page.findByIdAndUpdate(
          args.id,
          {
            $set: {
              status: statusType.active,
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
