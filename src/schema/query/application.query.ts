import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { ApplicationType } from '../types';
import mongoose from 'mongoose';
import { Application, Page } from '@models';
import { logger } from '@lib/logger';
import { accessibleBy } from '@casl/mongoose';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

/** Arguments for the application query */
type ApplicationArgs = {
  id: string | Types.ObjectId;
  asRole?: string | Types.ObjectId;
};

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
  async resolve(parent, args: ApplicationArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const ability = context.user.ability;
      const filters = Application.find(accessibleBy(ability).Application)
        .where({ _id: args.id })
        .getFilter();
      const application = await Application.findOne(filters);
      if (application && args.asRole) {
        const pages: Page[] = await Page.aggregate([
          {
            $match: {
              'permissions.canSee': {
                $elemMatch: { $eq: new mongoose.Types.ObjectId(args.asRole) },
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
      if (err instanceof GraphQLError) {
        throw new GraphQLError(err.message);
      }
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
