import { GraphQLObjectType, GraphQLID, GraphQLString, GraphQLBoolean, GraphQLList } from 'graphql';
import mongoose from 'mongoose';
import { ApplicationType, PermissionType, RoleType } from '.';
import { Role, Permission, Application } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import { PositionAttributeType } from './positionAttribute';

export const UserType = new GraphQLObjectType({
    name: 'User',
    fields: () => ({
        id: {
            type: GraphQLID,
            resolve(parent) {
                return parent._id;
            }
        },
        username: { type: GraphQLString },
        name: { type: GraphQLString },
        oid: { type: GraphQLString },
        favoriteApp: { type: GraphQLID },
        isAdmin: {
            type: GraphQLBoolean,
            resolve(parent) {
                return Role.exists({
                    application: null,
                    _id: { $in: parent.roles }
                });
            }
        },
        roles: {
            type: new GraphQLList(RoleType),
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                // Getting all roles / admin roles / application roles is determined by query populate at N+1 level.
                if (parent.roles && typeof(parent.roles === 'object')) {
                    return Role.accessibleBy(ability, 'read').where('_id').in(parent.roles.map(x => x._id));
                } else {
                    return Role.accessibleBy(ability, 'read').where('_id').in(parent.roles);
                }
            }
        },
        permissions: {
            type: new GraphQLList(PermissionType),
            async resolve(parent) {
                const roles = await Role.find().where('_id').in(parent.roles);
                // tslint:disable-next-line: no-shadowed-variable
                let permissions = [];
                for (const role of roles) {
                    if (role.permissions) {
                        permissions = permissions.concat(role.permissions);
                    }
                }
                permissions = [...new Set(permissions)];
                return Permission.find().where('_id').in(permissions);
            }
        },
        applications: {
            type: new GraphQLList(ApplicationType),
            async resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                const roles = await Role.find().where('_id').in(parent.roles);
                const applications = roles.map(x => mongoose.Types.ObjectId(x.application));
                return Application.accessibleBy(ability, 'read').where('_id').in(applications);
            }
        },
        positionAttributes: { type: new GraphQLList(PositionAttributeType) }
    })
});
