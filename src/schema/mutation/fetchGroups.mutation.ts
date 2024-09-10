import { GraphQLError, GraphQLList } from 'graphql';
import { Group } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { GroupType } from '../types';
import config from 'config';
import { fetchGroups } from '@utils/user';
import { logger } from '@lib/logger';
import { accessibleBy } from '@casl/mongoose';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';

/**
 * Fetches groups from service
 * Returns updated groups
 */
export default {
  type: new GraphQLList(GroupType),
  async resolve(parent, args, context: Context) {
    graphQLAuthCheck(context);
    try {
      const canFetch = !config.get('user.groups.local');
      if (!canFetch) {
        throw new GraphQLError(
          context.i18next.t(
            'mutations.group.fetch.errors.groupsFromServiceDisabled'
          )
        );
      }
      const ability: AppAbility = context.user.ability;
      if (!ability.can('create', 'Group')) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }
      let groups: Group[] = null;
      try {
        groups = await fetchGroups();
      } catch {
        throw new GraphQLError(
          context.i18next.t('mutations.group.fetch.errors.fetchRequestFailed')
        );
      }
      const bulkOps: any[] = [];
      groups.forEach((group) => {
        const upsertGroup = {
          updateOne: {
            filter: { oid: group.oid },
            update: {
              $set: {
                oid: group.oid,
                title: group.title,
                description: group.description,
              },
            },
            upsert: true,
          },
        };
        bulkOps.push(upsertGroup);
      });
      await Group.collection.bulkWrite(bulkOps);

      const filter = Group.find(
        accessibleBy(ability, 'read').Group
      ).getFilter();
      return await Group.find(filter);
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
