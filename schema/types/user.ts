import { GraphQLObjectType, GraphQLID, GraphQLString, GraphQLBoolean, GraphQLList } from "graphql";
import { ApplicationType, PermissionType, RoleType } from ".";
import permissions from "../../const/permissions";
import { Role, Permission, Application } from "../../models";
import checkPermission from "../../utils/checkPermission";

export const UserType = new GraphQLObjectType({
    name: 'User',
    fields: () => ({
        id: {
            type: GraphQLID,
            resolve(parent, args) {
                return parent._id;
            }
        },
        username: { type: GraphQLString },
        name: { type: GraphQLString },
        oid: { type: GraphQLString },
        isAdmin: {
            type: GraphQLBoolean,
            resolve(parent, args) {
                return Role.exists({
                    application: null,
                    _id: { $in: parent.roles }
                });
            }
        },
        roles: {
            type: new GraphQLList(RoleType),
            args: {
                all: { type: GraphQLBoolean }
            },
            resolve(parent, args) {
                return Role.find(args.all ? {} : { application: null }).where('_id').in(parent.roles);
            }
        },
        permissions: {
            type: new GraphQLList(PermissionType),
            async resolve(parent, args) {
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
            async resolve(parent, args) {
                const roles = await Role.find().where('_id').in(parent.roles);
                let userPermissions = [];
                for (const role of roles) {
                    if (role.permissions) {
                        userPermissions = userPermissions.concat(role.permissions);
                    }
                }
                userPermissions = [...new Set(userPermissions)];
                userPermissions = await Permission.find().where('_id').in(userPermissions);
                for (const permission of userPermissions) {
                    if (permission.type === permissions.canSeeApplications) {
                        return Application.find();
                    }
                }
                /*  If the user does not have the permission canSeeApplications, we look for
                    the second layer of permissions in each application.
                */
                return Application.find({ '_id': { $in: roles.map(x => x.application) } });
            }
        }
    })
});