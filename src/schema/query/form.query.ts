import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { decodeCursor, encodeCursor, FormType } from '../types';
import { LayoutFiltersInputType } from '../inputs';
import { Form, Layout } from '../../models';
import extendAbilityForContent from '../../security/extendAbilityForContent';
import { AppAbility } from '../../security/defineUserAbility';
import mongoose from 'mongoose';

/** Created object id from string */
const objectID = mongoose.Types.ObjectId;

/** Default page size for layout pagination */
const DEFAULT_FIRST = 10;

/**
 * Return form from id if available for the logged user.
 * Throw GraphQL error if not logged.
 */
export default {
  type: FormType,
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
    const formFilters = Form.accessibleBy(ability, 'read')
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
        $gt: [
          '$$layout._id',
          new objectID(decodeCursor(args.layoutFilters.afterCursor)),
        ],
      });
    }

    const res = await Form.aggregate([
      { $match: formFilters },
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

    const form = new Form({
      ...res[0].document,
      layouts: res[0].layouts.slice(0, firstLayouts),
    });

    const contentAbility = await extendAbilityForContent(user, form);
    if (contentAbility.cannot('read', form)) {
      throw new GraphQLError(context.i18next.t('errors.permissionNotGranted'));
    }

    return {
      ...form.toObject(),
      id: form._id,
      layouts: {
        edges:
          form.layouts.lenght > 0
            ? form.layouts.map((layout: Layout) => {
                return {
                  cursor: encodeCursor(layout?._id.toString()),
                  node: layout,
                };
              })
            : [],
        pageInfo: {
          hasNextPage: firstLayouts < res[0].layouts.length,
          endCursor:
            form.layouts.lenght > 0
              ? encodeCursor(
                  form.layouts[form.layouts.length - 1]?._id.toString()
                )
              : null,
        },
        totalCount: res[0].totalLayouts,
      },
    };
  },
};
