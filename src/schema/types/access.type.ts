import { GraphQLObjectType, GraphQLList } from 'graphql';
import { RoleType } from '.';
import { Role } from '@models';
import GraphQLJSON from 'graphql-type-json';
import { AppAbility } from '@security/defineUserAbility';
import { accessibleBy } from '@casl/mongoose';

/** GraphQL access type definition */
export const AccessType = new GraphQLObjectType({
  name: 'Access',
  fields: () => ({
    canSee: {
      type: new GraphQLList(RoleType),
      async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        const roles = await Role.find(accessibleBy(ability, 'read').Role)
          .where('_id')
          .in(parent.canSee);
        return roles;
      },
    },
    canUpdate: {
      type: new GraphQLList(RoleType),
      async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        const roles = await Role.find(accessibleBy(ability, 'read').Role)
          .where('_id')
          .in(parent.canUpdate);
        return roles;
      },
    },
    canDelete: {
      type: new GraphQLList(RoleType),
      async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        const roles = await Role.find(accessibleBy(ability, 'read').Role)
          .where('_id')
          .in(parent.canDelete);
        return roles;
      },
    },
    canCreateRecords: {
      type: new GraphQLList(RoleType),
      async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        const roles = await Role.find(accessibleBy(ability, 'read').Role)
          .where('_id')
          .in(parent.canCreateRecords);
        return roles;
      },
    },
    canSeeRecords: {
      type: new GraphQLList(GraphQLJSON),
    },
    canUpdateRecords: {
      type: new GraphQLList(GraphQLJSON),
    },
    canDeleteRecords: {
      type: new GraphQLList(GraphQLJSON),
    },
    canDownloadRecords: {
      type: new GraphQLList(RoleType),
      async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        const roles = await Role.find(accessibleBy(ability, 'read').Role)
          .where('_id')
          .in(parent.canDownloadRecords);
        return roles;
      },
    },
    recordsUnicity: {
      type: GraphQLJSON,
    },
  }),
});
