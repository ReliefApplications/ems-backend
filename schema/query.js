/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
const graphql = require('graphql');
const mongoose = require('mongoose');
const Form = require('../models/form');
const Permission = require('../models/permission');
const Resource = require('../models/resource');
const Record = require('../models/record');
const Dashboard = require('../models/dashboard');
const User = require('../models/user');
const Role = require('../models/role');
const checkPermission = require('../utils/checkPermission');
const permissions = require('../const/permissions');
const errors = require('../const/errors');

const {
    GraphQLNonNull,
    GraphQLObjectType,
    GraphQLID,
    GraphQLList,
} = graphql;

const { GraphQLError } = require('graphql/error');

const {
    PermissionType,
    ResourceType,
    FormType,
    RecordType,
    DashboardType,
    RoleType,
    UserType
} = require('./types');

// === QUERIES ===
const Query = new GraphQLObjectType({
    name: 'Query',
    fields: {
        resources: {
            /*  List all resources available for the logged user.
                Throw GraphQL error if not logged.
            */
            type: new GraphQLList(ResourceType),
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canManageResources)) {
                    return Resource.find({});
                } else {
                    const filters = {
                        'permissions.canSee': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) }
                    };
                    return Resource.find(filters);
                }
            },
        },
        resource: {
            /*  Returns resource from id if available for the logged user.
                Throw GraphQL error if not logged.
            */
            type: ResourceType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) },
            },
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canManageResources)) {
                    return Resource.findById(args.id);
                } else {
                    const filters = {
                        'permissions.canSee': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                        _id: args.id
                    };
                    return Resource.findOne(filters);
                }
            },
        },
        forms: {
            /*  List all forms available for the logged user.
                Throw GraphQL error if not logged.
            */
            type: new GraphQLList(FormType),
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canManageForms)) {
                    return Form.find({});
                } else {
                    const filters = {
                        'permissions.canSee': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) }
                    };
                    return Form.find(filters);
                }
            },
        },
        form: {
            /*  Returns form from id if available for the logged user.
                Throw GraphQL error if not logged.
            */
            type: FormType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) },
            },
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canManageForms)) {
                    return Form.findById(args.id);
                } else {
                    const filters = {
                        'permissions.canSee': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                        _id: args.id
                    };
                    return Form.findOne(filters);
                }
            },
        },
        // TODO
        records: {
            /*  List all records available for the logged user.
                Throw GraphQL error if not logged.
            */
            type: new GraphQLList(RecordType),
            resolve(parent, args) {
                return Record.find({});
            },
        },
        // TODO
        record: {
            /*  Returns record from id if available for the logged user.
                Throw GraphQL error if not logged.
            */
            type: RecordType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) },
            },
            resolve(parent, args) {
                return Record.findById(args.id);
            },
        },
        dashboards: {
            /*  List all dashboards available for the logged user.
                Throw GraphQL error if not logged.
            */
            type: new GraphQLList(DashboardType),
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canManageDashboards)) {
                    return Dashboard.find({});
                } else {
                    const filters = {
                        'permissions.canSee': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) }
                    };
                    return Dashboard.find(filters);
                }
            },
        },
        dashboard: {
            /*  Returns dashboard from id if available for the logged user.
                Throw GraphQL error if not logged.
            */
            type: DashboardType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) },
            },
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canManageDashboards)) {
                    return Dashboard.findById(args.id);
                } else {
                    const filters = {
                        'permissions.canSee': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                        _id: args.id
                    };
                    return Dashboard.findOne(filters);
                }
            },
        },
        users: {
            /*  List users if logged user has admin permission.
                Throw GraphQL error if not logged or not authorized.
            */
            type: new GraphQLList(UserType),
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canSeeUsers)) {
                    return User.find({});
                } else {
                    throw new GraphQLError(errors.userNotLogged);
                }
            }
        },
        me: {
            /*  Returns user from logged user id.
                Throw GraphQL error if not logged.
            */
            type: UserType,
            resolve(parent, args, context) {
                const user = context.user;
                if (user) {
                    return User.findById(user.id);
                } else {
                    throw new GraphQLError(errors.userNotLogged);
                }
            }
        },
        roles: {
            /*  List roles if logged user has admin permission.
                Throw GraphQL error if not logged or not authorized.
            */
            type: new GraphQLList(RoleType),
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canSeeRoles)) {
                    return Role.find({});
                } else {
                    throw new GraphQLError(errors.permissionNotGranted);
                }
            }
        },
        permissions: {
            /*  List permissions.
                Throw GraphQL error if not logged.
            */
            type: new GraphQLList(PermissionType),
            resolve(parent, args, context) {
                const user = context.user;
                if (user) {
                    return Permission.find({});
                } else {
                    throw new GraphQLError(errors.userNotLogged);
                }
            }
        }
    },
});

module.exports = Query;