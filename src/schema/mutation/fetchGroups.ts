import { GraphQLError, GraphQLList } from 'graphql';
import { Group } from '../../models';
import { AppAbility } from '../../security/defineUserAbility';
import { GroupType } from '../types';
import nodeConfig from 'config';
import { fetchGroupsFromService } from '../../server/fetchGroups';

/**
 * Fetches groups from service
 * Retruns updated groups
 */
export default {
  type: new GraphQLList(GroupType),
  async resolve(parent, args, context) {
    const canFetch = !nodeConfig.get('groups.manualCreation');
    if (!canFetch) {
      throw new GraphQLError(
        context.i18next.t('errors.groupsFromServiceDisabled')
      );
    }

    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }
    const ability: AppAbility = context.user.ability;
    if (!ability.can('create', 'Group')) {
      throw new GraphQLError(context.i18next.t('errors.permissionNotGranted'));
    }

    const groups = await fetchGroupsFromService();
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
