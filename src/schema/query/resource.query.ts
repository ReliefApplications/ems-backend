import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { decodeCursor, encodeCursor, ResourceType } from '../types';
import { Resource } from '../../models';
import { AppAbility } from '../../security/defineUserAbility';
import { LayoutFiltersInputType } from '../../schema/inputs';
import mongoose from 'mongoose';

/** Created object id from string */
const objectID = mongoose.Types.ObjectId;

/** Default page size for layout pagination */
const DEFAULT_FIRST = 10;

/**
 * Return resource from id if available for the logged user.
 * Throw GraphQL error if not logged.
 */
export default {
  type: ResourceType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    layoutFilters: { type: LayoutFiltersInputType },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }

    const ability: AppAbility = user.ability;
    const resourceFilters = Resource.accessibleBy(ability, 'read')
      .where({ _id: new objectID(args.id) })
      .getFilter();

    const firstLayouts = args.layoutFilters?.first || DEFAULT_FIRST;
    const layoutFilter: any = {};

    // Filter layout by id
    if (args.layoutFilters?.ids) {
      Object.assign(layoutFilter, {
        $in: [
          '$$layout._id',
          args.layoutFilters.ids.map((id) => new objectID(id)),
        ],
      });
    }

    if (args.layoutFilters?.afterCursor) {
      Object.assign(layoutFilter, {
        $gt: ['$$layout._id', decodeCursor(args.layoutFilters.afterCursor)],
      });
    }

    const res = await Resource.aggregate([
      { $match: resourceFilters },
      {
        $project: {
          document: '$$ROOT',
          totalLayouts: { $size: '$layouts' },
          layouts: {
            $filter: {
              input: '$layouts',
              as: 'layout',
              cond: layoutFilter,
            },
          },
        },
      },
    ]);

    if (!res[0]) {
      throw new GraphQLError(context.i18next.t('errors.dataNotFound'));
    }

    const resource = new Resource({
      ...res[0].document,
      layouts: res[0].layouts.slice(0, firstLayouts),
    });

    if (ability.cannot('read', resource)) {
      throw new GraphQLError(context.i18next.t('errors.permissionNotGranted'));
    }

    return {
      ...resource,
      layouts: {
        edges: resource.layouts.map((layout) => ({
          cursor: encodeCursor(layout._id.toString()),
          node: layout,
        })),
        pageInfo: {
          hasNextPage: firstLayouts > resource.layouts.length,
          endCursor: encodeCursor(
            resource.layouts[resource.layouts.length - 1]._id.toString()
          ),
        },
        totalCount: res[0].totalLayouts,
      },
    };
  },
};
