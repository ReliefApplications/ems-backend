import { accessibleBy } from '@casl/mongoose';
import { Application, Page } from '@models';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';
import { logger } from '@services/logger.service';
import {
  GraphQLError,
  GraphQLID,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql';
import mongoose, { Types } from 'mongoose';
import { ApplicationType } from '../types';

/** Arguments for the application query */
type ApplicationArgs = {
  id: string | Types.ObjectId;
  shortcut: string;
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
    shortcut: { type: GraphQLString },
    asRole: { type: GraphQLID },
  },
  async resolve(parent, args: ApplicationArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const ability = context.user.ability;
      let filters = {};
      if (mongoose.isValidObjectId(args.id)) {
        if (args.shortcut) {
          filters = {
            $or: [{ _id: args.id }, { shortcut: args.shortcut }],
          };
        } else {
          filters = { _id: args.id };
        }
      } else {
        filters = { shortcut: args.shortcut };
      }
      filters = Application.find(accessibleBy(ability).Application)
        .where(filters)
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
