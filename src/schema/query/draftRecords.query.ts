import {
  GraphQLError,
  GraphQLID,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql';
import { accessibleBy } from '@casl/mongoose';
import { Form, Record } from '@models';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { logger } from '@services/logger.service';
import { getErrorMessage, getErrorStack } from '@utils/error';
import { getDraftRecordFilter } from '@utils/filter';
import checkPageSize from '@utils/schema/errors/checkPageSize.util';
import getSortOrder from '@utils/schema/resolvers/Query/getSortOrder';
import { recordVisibility, RecordVisibility } from '@const/enumTypes';
import { DraftRecordConnectionType, encodeCursor } from '../types';

/** Default number of draft summaries per page. */
const DEFAULT_FIRST = 10;
/** Fields accepted for server-side sorting. */
const SORT_FIELDS = ['createdAt', 'modifiedAt'];
/** Sort directions accepted by Mongo queries. */
const SORT_ORDERS = ['asc', 'desc'];

/** Arguments for the draft records query. */
type DraftRecordsArgs = {
  form: string;
  first?: number;
  skip?: number;
  sortField?: string;
  sortOrder?: string;
};

/** Minimal draft record response. */
type DraftRecordSummary = {
  id: string;
  createdAt: Date;
  modifiedAt: Date;
};

/**
 * Lists the current user's drafts for a form without loading record data.
 */
export default {
  type: DraftRecordConnectionType,
  args: {
    form: { type: new GraphQLNonNull(GraphQLID) },
    first: { type: GraphQLInt },
    skip: { type: GraphQLInt },
    sortField: { type: GraphQLString },
    sortOrder: { type: GraphQLString },
  },
  async resolve(_parent: unknown, args: DraftRecordsArgs, context: Context) {
    graphQLAuthCheck(context);
    const first = args.first ?? DEFAULT_FIRST;
    const skip = args.skip ?? 0;

    try {
      if (first < 1 || skip < 0) {
        throw new GraphQLError(
          'first must be positive and skip must be non-negative'
        );
      }
      checkPageSize(first);
      if (!context.user?._id) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }
      const sortField = args.sortField || 'modifiedAt';
      const sortOrder = args.sortOrder || 'desc';
      if (!SORT_FIELDS.includes(sortField)) {
        throw new GraphQLError(`Cannot sort by ${sortField} field`);
      }
      if (!SORT_ORDERS.includes(sortOrder)) {
        throw new GraphQLError(`Cannot sort in ${sortOrder} order`);
      }

      const form = await Form.findById(args.form).populate({
        path: 'resource',
        model: 'Resource',
      });
      if (!form) {
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      }
      const ability = await extendAbilityForRecords(context.user, form);
      if (ability.cannot('read', form)) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }
      const filters = {
        ...accessibleBy(ability, 'read').Record,
        archived: { $ne: true },
        form: args.form,
        ...getDraftRecordFilter(
          {
            recordVisibility: recordVisibility.ownDrafts as RecordVisibility,
          },
          context.user
        ),
      };
      const [records, totalCount] = await Promise.all([
        Record.find(filters)
          .select('_id createdAt modifiedAt')
          .sort({
            [sortField]: getSortOrder(sortOrder),
            _id: getSortOrder(sortOrder),
          })
          .skip(skip)
          .limit(first)
          .lean(),
        Record.countDocuments(filters),
      ]);
      const nodes: DraftRecordSummary[] = records.map((record) => ({
        id: record._id.toString(),
        createdAt: record.createdAt,
        modifiedAt: record.modifiedAt,
      }));
      const edges = nodes.map((node) => ({
        cursor: encodeCursor(node.id),
        node,
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage: skip + nodes.length < totalCount,
          startCursor: edges.length > 0 ? edges[0].cursor : null,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
        totalCount,
      };
    } catch (err) {
      logger.error(getErrorMessage(err), { stack: getErrorStack(err) });
      if (err instanceof GraphQLError) {
        throw new GraphQLError(err.message);
      }
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
