import {
    GraphQLNonNull,
    GraphQLObjectType,
    GraphQLID,
    GraphQLList,
    GraphQLBoolean
} from 'graphql';
import mongoose from 'mongoose';
import Form from '../models/form';
import Permission from '../models/permission';
import Resource from '../models/resource';
import Record from '../models/record';
import Dashboard from '../models/dashboard';
import User from '../models/user';
import Role from '../models/role';
import Application from '../models/application';
import Page from '../models/page';
import Workflow from '../models/workflow';
import Step from '../models/step';
import checkPermission from '../utils/checkPermission';
import permissions from '../const/permissions';
import errors from '../const/errors';
import { contentType } from '../const/contentType';

import { GraphQLError } from 'graphql/error';

import { PermissionType, ResourceType, FormType, RecordType, DashboardType, RoleType, UserType, ApplicationType, StepType, WorkflowType, PageType, NotificationType } from './types';

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
                if (checkPermission(user, permissions.canSeeResources)) {
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
                if (checkPermission(user, permissions.canSeeResources)) {
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
        notifications: {
            type: new GraphQLList(NotificationType),
            resolve(parent, args, context) {
                return [];
            }
        },
        forms: {
            /*  List all forms available for the logged user.
                Throw GraphQL error if not logged.
            */
            type: new GraphQLList(FormType),
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canSeeForms)) {
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
                if (checkPermission(user, permissions.canSeeForms)) {
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
        // TODO: check permissions for getting records
        records: {
            /*  List all records available for the logged user.
                Throw GraphQL error if not logged.
            */
            type: new GraphQLList(RecordType),
            resolve(parent, args, context) {
                return Record.find({});
            },
        },
        // TODO: check permissions for getting a record
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
            args: {
                all: { type: GraphQLBoolean }
            },
            async resolve(parent, args, context) {
                const user = context.user;
                const filters = {};
                if (!args.all) {
                    const contentIds = await Page.find({
                        'type': { $eq: contentType.dashboard },
                        'content': { $ne: null }
                    }).distinct('content');
                    const stepIds = await Step.find({
                        'type': { $eq: contentType.dashboard },
                        'content': { $ne: null }
                    }).distinct('content');
                    Object.assign(filters, { _id: { $nin: contentIds.concat(stepIds) } });
                }
                if (checkPermission(user, permissions.canSeeApplications)) {
                    return Dashboard.find(filters);
                } else {
                    throw new GraphQLError(errors.permissionNotGranted);
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
            async resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canSeeApplications)) {
                    return Dashboard.findById(args.id);
                } else {
                    const filters = {
                        'permissions.canSee': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                        content: args.id
                    };
                    const page = await Page.find(filters);
                    const step = await Step.find(filters);
                    if (page || step) {
                        return Dashboard.findById(args.id);
                    }
                    throw new GraphQLError(errors.permissionNotGranted);
                }
            },
        },
        users: {
            /*  List back-office users if logged user has admin permission.
                Throw GraphQL error if not logged or not authorized.
            */
            type: new GraphQLList(UserType),
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canSeeUsers)) {
                    return User.find({}).populate({
                        path: 'roles',
                        match: { application: { $eq: null } }
                    });
                } else {
                    throw new GraphQLError(errors.permissionNotGranted);
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
            args: {
                all: { type: GraphQLBoolean },
                application: { type: GraphQLID }
            },
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canSeeRoles)) {
                    if (args.all) {
                        return Role.find({});
                    } else {
                        if (args.application) {
                            return Role.find({ application: args.application });
                        } else {
                            return Role.find({ application: null });
                        }
                    }
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
            args: {
                application: { type: GraphQLBoolean },
            },
            resolve(parent, args, context) {
                const user = context.user;
                if (user) {
                    if (args.application) {
                        return Permission.find({ global: false } )
                    }
                    return Permission.find({ global: true });
                } else {
                    throw new GraphQLError(errors.userNotLogged);
                }
            }
        },
        applications: {
            /*  List all applications available for the logged user.
                Throw GraphQL error if not logged.
            */
            type: new GraphQLList(ApplicationType),
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canSeeApplications)) {
                    return Application.find({});
                } else {
                    const filters = {
                        'permissions.canSee': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id))}
                    };
                    return Application.find(filters);
                }
            }
        },
        application: {
            /*  Returns application from id if available for the logged user.
                If asRole boolean is passed true, do the query as if the user was the corresponding role
                Throw GraphQL error if not logged.
            */
            type: ApplicationType,
            args : {
                id: { type: new GraphQLNonNull(GraphQLID) },
                asRole: { type: GraphQLID }
            },
            async resolve(parent, args, context) {
                const user = context.user;
                let application = null;
                if (checkPermission(user, permissions.canSeeApplications)) {
                    application = await Application.findById(args.id);
                } else {
                    const filters = {
                        'permissions.canSee': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                        _id: args.id
                    };
                    application = await Application.findOne(filters);
                }
                if (application && args.asRole) {
                    const pages = await Page.aggregate([
                        { '$match' : {
                            'permissions.canSee': { $elemMatch: { $eq: mongoose.Types.ObjectId(args.asRole) } },
                            '_id' : { '$in' : application.pages }
                        } },
                        { '$addFields' : { '__order' : { '$indexOfArray': [ application.pages, '$_id' ] } } },
                        { '$sort' : { '__order' : 1 } }
                    ]);
                    application.pages = pages.map(x => x._id);
                }
                return application;
            },
        },
        pages: {
            /*  List all pages available for the logged user.
                Throw GraphQL error if not logged.
            */
            type: new GraphQLList(PageType),
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canSeeApplications)) {
                    return Page.find({});
                } else {
                    const filters = {
                        'permissions.canSee': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id))}
                    };
                    return Page.find(filters);
                }
            }
        },
        page: {
            /*  Returns page from id if available for the logged user.
                Throw GraphQL error if not logged.
            */
            type: PageType,
            args : {
                id: { type: new GraphQLNonNull(GraphQLID) }
            },
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canSeeApplications)) {
                    return Page.findById(args.id);
                } else {
                    const filters = {
                        'permissions.canSee': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                        _id: args.id
                    };
                    return Page.findOne(filters);
                }
            },
        },
        workflows: {
            /*  List all workflows available for the logged user.
                Throw GraphQL error if not logged.
            */
            type: new GraphQLList(WorkflowType),
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canSeeApplications)) {
                    return Workflow.find({});
                } else {
                    return new GraphQLError(errors.permissionNotGranted);
                }
            }
        },
        workflow: {
            /*  Returns workflow from id if available for the logged user.
                Throw GraphQL error if not logged.
            */
            type: WorkflowType,
            args : {
                id: { type: new GraphQLNonNull(GraphQLID) },
                asRole: { type: GraphQLID }
            },
            async resolve(parent, args, context) {
                const user = context.user;
                let workflow = null;
                if (checkPermission(user, permissions.canSeeApplications)) {
                    workflow = await Workflow.findById(args.id);
                } else {
                    const filters = {
                        'permissions.canSee': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                        content: args.id
                    };
                    const page = await Page.find(filters);
                    const step = await Step.find(filters);
                    if (page || step) {
                        workflow = await Workflow.findById(args.id);
                    }
                }
                if (workflow) {
                    if (args.asRole) {
                        const steps = await Step.aggregate([
                            { '$match' : {
                                'permissions.canSee': { $elemMatch: { $eq: mongoose.Types.ObjectId(args.asRole) } },
                                '_id' : { '$in' : workflow.steps }
                            } },
                            { '$addFields' : { '__order' : { '$indexOfArray': [ workflow.steps, '$_id' ] } } },
                            { '$sort' : { '__order' : 1 } }
                        ]);
                        workflow.steps = steps.map(x => x._id);
                    }
                    return workflow;
                }
                throw new GraphQLError(errors.permissionNotGranted);
            },
        },
        steps: {
            /*  List all steps available for the logged user.
                Throw GraphQL error if not logged.
            */
            type: new GraphQLList(StepType),
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canSeeApplications)) {
                    return Step.find({});
                } else {
                    const filters = {
                        'permissions.canSee': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id))}
                    };
                    return Step.find(filters);
                }
            }
        },
        step: {
            /*  Returns step from id if available for the logged user.
                Throw GraphQL error if not logged.
            */
            type: StepType,
            args : {
                id: { type: new GraphQLNonNull(GraphQLID) }
            },
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canSeeApplications)) {
                    return Step.findById(args.id);
                } else {
                    const filters = {
                        'permissions.canSee': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                        _id: args.id
                    };
                    return Step.findOne(filters);
                }
            },
        }
    },
});

export default Query;