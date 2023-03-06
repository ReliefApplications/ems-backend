import { GraphQLObjectType, GraphQLList } from 'graphql';
import { RoleType } from '.';
import { Role } from '@models';
import GraphQLJSON from 'graphql-type-json';
import { AppAbility } from '@security/defineUserAbility';

/** GraphQL access type definition */
export const AccessType = new GraphQLObjectType({
  name: 'Access',
  fields: () => ({
    canSee: {
      type: new GraphQLList(RoleType),
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return Role.accessibleBy(ability, 'read')
          .where('_id')
          .in(parent.canSee);
      },
    },
    canUpdate: {
      type: new GraphQLList(RoleType),
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return Role.accessibleBy(ability, 'read')
          .where('_id')
          .in(parent.canUpdate);
      },
    },
    canDelete: {
      type: new GraphQLList(RoleType),
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return Role.accessibleBy(ability, 'read')
          .where('_id')
          .in(parent.canDelete);
      },
    },
    canCreateRecords: {
      type: new GraphQLList(RoleType),
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return Role.accessibleBy(ability, 'read')
          .where('_id')
          .in(parent.canCreateRecords);
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
    recordsUnicity: {
      type: GraphQLJSON,
    },
  }),
});
