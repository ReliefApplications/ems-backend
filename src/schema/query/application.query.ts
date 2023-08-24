import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { ApplicationType } from '../types';
import mongoose from 'mongoose';
import { Application, Page } from '@models';
import { logger } from '@services/logger.service';
import { checkUserAuthenticated } from '@utils/schema';

/**
 * Returns application from id if available for the logged user.
 * If asRole boolean is passed true, do the query as if the user was the corresponding role
 * Throw GraphQL error if not logged.
 */
export default {
  type: ApplicationType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    asRole: { type: GraphQLID },
  },
  async resolve(parent, args, context) {
    const user = context.user;
    checkUserAuthenticated(user);
    try {
      const ability = context.user.ability;
      const filters = Application.accessibleBy(ability)
        .where({ _id: args.id })
        .getFilter();
      const application = await Application.findOne(filters);
      if (application && args.asRole) {
        const pages: Page[] = await Page.aggregate([
          {
            $match: {
              'permissions.canSee': {
                $elemMatch: { $eq: mongoose.Types.ObjectId(args.asRole) },
              },
              _id: { $in: application.pages },
            },
          },
          {
            $addFields: {
              __order: { $indexOfArray: [application.pages, '$_id'] },
            },
          },
          { $sort: { __order: 1 } },
        ]);
        application.pages = pages.map((x) => x._id);
      }
      if (!application) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }
      return application;
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
