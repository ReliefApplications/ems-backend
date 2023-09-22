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
        const dashboard = await Dashboard.findById(page.content);
        if (!!dashboard) {
          await Dashboard.findByIdAndUpdate(
            dashboard._id,
            {
              $set: {
                status: statusType.active,
              },
            },
            { new: true }
          );
        }
        const workflow = await Workflow.findById(page.content);
        if (!!workflow) {
          await Workflow.findByIdAndUpdate(
            workflow._id,
            {
              $set: {
                status: statusType.active,
              },
            },
            { new: true }
          );
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
