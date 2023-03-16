import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLBoolean,
  GraphQLList,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import mongoose from 'mongoose';
import { ApplicationType, PermissionType, RoleType, GroupType } from '.';
import { Role, Permission, Application, Resource, Form, Group } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { PositionAttributeType } from './positionAttribute.type';
import permissions from '@const/permissions';
import { Connection } from './pagination.type';

/**
 * GraphQL User type.
 */
export const UserType = new GraphQLObjectType({
  name: 'User',
  fields: () => ({
    id: {
      type: GraphQLID,
      resolve(parent) {
        return parent._id;
      },
    },
    username: { type: GraphQLString },
    name: { type: GraphQLString },
    firstName: { type: GraphQLString },
    lastName: { type: GraphQLString },
    oid: { type: GraphQLString },
    favoriteApp: { type: GraphQLID },
    isAdmin: {
      type: GraphQLBoolean,
      resolve(parent) {
        return Role.exists({
          application: null,
          _id: { $in: parent.roles },
        });
      },
    },
    roles: {
      type: new GraphQLList(RoleType),
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        // Getting all roles / admin roles / application roles is determined by query populate at N+1 level.
        if (parent.roles && typeof parent.roles === 'object') {
          return Role.accessibleBy(ability, 'read')
            .where('_id')
            .in(parent.roles.map((x) => x._id));
        } else {
          return Role.accessibleBy(ability, 'read')
            .where('_id')
            .in(parent.roles);
        }
      },
    },
    groups: {
      type: new GraphQLList(GroupType),
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;

        if (parent.groups && typeof parent.groups === 'object') {
          return Group.accessibleBy(ability, 'read')
            .where('_id')
            .in(parent.groups.map((x) => x._id));
        } else {
          return Group.accessibleBy(ability, 'read')
            .where('_id')
            .in(parent.groups);
        }
      },
    },
    permissions: {
      type: new GraphQLList(PermissionType),
      async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        const roles = await Role.find().where('_id').in(parent.roles).populate({
          path: 'permissions',
          model: 'Permission',
        });
        let userPermissions = [];
        for (const role of roles) {
          if (role.permissions) {
            userPermissions = userPermissions.concat(role.permissions);
          }
        }
        userPermissions = [...new Set(userPermissions)];
        // Update can_see properties to enable them if the user can see at least one object with object permissions
        const additionalPermissions = [];
        if (
          !userPermissions.some((x) => x.type === permissions.canSeeResources)
        ) {
          const resources = await Resource.accessibleBy(
            ability,
            'read'
          ).count();
          if (resources > 0) {
            additionalPermissions.push(permissions.canSeeResources);
          }
        }
        if (!userPermissions.some((x) => x.type === permissions.canSeeForms)) {
          const forms = await Form.accessibleBy(ability, 'read').count();
          if (forms > 0) {
            additionalPermissions.push(permissions.canSeeForms);
          }
        }
        if (
          !userPermissions.some(
            (x) => x.type === permissions.canSeeApplications
          )
        ) {
          const applications = await Application.accessibleBy(
            ability,
            'read'
          ).count();
          if (applications > 0) {
            additionalPermissions.push(permissions.canSeeApplications);
          }
        }
        const filter = {
          $or: [
            {
              _id: {
                $in: userPermissions.map((x) => mongoose.Types.ObjectId(x._id)),
              },
            },
            { type: { $in: additionalPermissions } },
          ],
        };
        return Permission.find(filter);
      },
    },
    applications: {
      type: new GraphQLList(ApplicationType),
      async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return Application.accessibleBy(ability, 'read').sort({
          modifiedAt: -1,
        });
      },
    },
    positionAttributes: { type: new GraphQLList(PositionAttributeType) },
    attributes: { type: GraphQLJSON },
  }),
});

/** User connection type */
export const UserConnectionType = Connection(UserType);
