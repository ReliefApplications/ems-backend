import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLBoolean,
  GraphQLList,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { Types } from 'mongoose';
import { ApplicationType, PermissionType, RoleType, GroupType } from '.';
import { Role, Permission, Application, Resource, Form, Group } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { PositionAttributeType } from './positionAttribute.type';
import permissions from '@const/permissions';
import { Connection } from './pagination.type';
import { accessibleBy } from '@casl/mongoose';

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
      async resolve(parent) {
        return !!(await Role.exists({
          application: null,
          _id: { $in: parent.roles },
        }));
      },
    },
    roles: {
      type: new GraphQLList(RoleType),
      async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        // Getting all roles / admin roles / application roles is determined by query populate at N+1 level.
        if (parent.roles && typeof parent.roles === 'object') {
          const roles = await Role.find(accessibleBy(ability, 'read').Role)
            .where('_id')
            .in(parent.roles.map((x) => (x._id ? x._id : x)));
          return roles;
        } else {
          const roles = await Role.find(accessibleBy(ability, 'read').Role)
            .where('_id')
            .in(parent.roles);
          return roles;
        }
      },
    },
    groups: {
      type: new GraphQLList(GroupType),
      async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        const groups = await Group.find(accessibleBy(ability, 'read').Group)
          .where('_id')
          .in(
            parent.groups && typeof parent.groups === 'object'
              ? parent.groups.map((x) => x._id)
              : parent.groups
          );
        return groups;
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
          const resources = await Resource.find(
            accessibleBy(ability, 'read').Resource
          ).count();
          if (resources > 0) {
            additionalPermissions.push(permissions.canSeeResources);
          }
        }
        if (!userPermissions.some((x) => x.type === permissions.canSeeForms)) {
          const forms = await Form.find(
            accessibleBy(ability, 'read').Form
          ).count();
          if (forms > 0) {
            additionalPermissions.push(permissions.canSeeForms);
          }
        }
        if (
          !userPermissions.some(
            (x) => x.type === permissions.canSeeApplications
          )
        ) {
          const applications = await Application.find(
            accessibleBy(ability, 'read').Application
          ).count();
          if (applications > 0) {
            additionalPermissions.push(permissions.canSeeApplications);
          }
        }
        const filter = {
          $or: [
            {
              _id: {
                $in: userPermissions.map((x) => new Types.ObjectId(x._id)),
              },
            },
            { type: { $in: additionalPermissions } },
          ],
        };
        const perm = await Permission.find(filter);
        return perm;
      },
    },
    applications: {
      type: new GraphQLList(ApplicationType),
      async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        const apps = await Application.find(
          accessibleBy(ability, 'read').Application
        ).sort({ modifiedAt: -1 });
        return apps;
      },
    },
    positionAttributes: { type: new GraphQLList(PositionAttributeType) },
    attributes: { type: GraphQLJSON },
  }),
});

/** User connection type */
export const UserConnectionType = Connection(UserType);
