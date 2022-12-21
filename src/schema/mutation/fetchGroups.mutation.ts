import { GraphQLError, GraphQLList } from 'graphql';
import { Group } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { GroupType } from '../types';
import config from 'config';
import { fetchGroups } from '@utils/user';

/**
 * Fetches groups from service
 * Returns updated groups
 */
export default {
  type: new GraphQLList(GroupType),
  async resolve(parent, args, context) {
    const canFetch = !config.get('user.groups.local');
    if (!canFetch) {
      throw new GraphQLError(
        context.i18next.t(
          'mutations.group.fetch.errors.groupsFromServiceDisabled'
        )
      );
    }

    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }
    const ability: AppAbility = context.user.ability;
    if (!ability.can('create', 'Group')) {
      throw new GraphQLError(
        context.i18next.t('common.errors.permissionNotGranted')
      );
    }

    const groups = await fetchGroups();
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

    const filter = Group.accessibleBy(ability, 'read').getFilter();
    return Group.find(filter);
  },
};
