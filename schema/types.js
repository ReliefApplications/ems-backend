/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
const graphql = require('graphql');
const mongoose = require('mongoose');
const Form = require('../models/form');
const FormVersion = require('../models/form-version');
const Resource = require('../models/resource');
const Permission = require('../models/permission');
const Record = require('../models/record');
const User = require('../models/user');
const Role = require('../models/role');
const Page = require('../models/page');
const Step = require('../models/step');
const Workflow = require('../models/workflow');
const Dashboard = require('../models/dashboard');
const Application = require('../models/application');
const checkPermission = require('../utils/checkPermission');
const permissions = require('../const/permissions');
const {
    ContentEnumType,
    contentType,
} = require('../const/contentType');

const {
    GraphQLObjectType,
    GraphQLString,
    GraphQLID,
    GraphQLBoolean,
    GraphQLInt,
    GraphQLList,
} = graphql;
const { GraphQLJSON } = require('graphql-type-json');


// === TYPES ===
const PermissionType = new GraphQLObjectType({
    name: 'Permission',
    fields: () => ({
        id: { type: GraphQLID },
        type: { type: GraphQLString },
    }),
});

const AccessType = new GraphQLObjectType({
    name: 'Access',
    fields: () => ({
        canSee: {
            type: new GraphQLList(RoleType),
            resolve(parent, args, ctx, info) {
                return Role.find().where('_id').in(parent.canSee);
            }
        },
        canCreate: {
            type: new GraphQLList(RoleType),
            resolve(parent, args) {
                return Role.find().where('_id').in(parent.canCreate);
            }
        },
        canUpdate: {
            type: new GraphQLList(RoleType),
            resolve(parent, args) {
                return Role.find().where('_id').in(parent.canUpdate);
            }
        },
        canDelete: {
            type: new GraphQLList(RoleType),
            resolve(parent, args) {
                return Role.find().where('_id').in(parent.canDelete);
            }
        }
    })
});

const ResourceType = new GraphQLObjectType({
    name: 'Resource',
    fields: () => ({
        id: { type: GraphQLID },
        name: { type: GraphQLString },
        createdAt: { type: GraphQLString },
        permissions: { type: AccessType },
        forms: {
            type: new GraphQLList(FormType),
            resolve(parent, args) {
                return Form.find({ resource: parent.id });
            },
        },
        coreForm: {
            type: FormType,
            resolve(parent, args) {
                return Form.find({ resource: parent.id, core: true });
            },
        },
        records: {
            type: new GraphQLList(RecordType),
            args: {
                filters: { type: GraphQLJSON },
            },
            resolve(parent, args) {
                let filters = {
                    resource: parent.id
                };
                if (args.filters) {
                    for (const filter of args.filters) {
                        filters[`data.${filter.name}`] = filter.equals;
                    }
                }
                return Record.find(filters);
            },
        },
        recordsCount: {
            type: GraphQLInt,
            resolve(parent, args) {
                return Record.find({ resource: parent.id }).count();
            },
        },
        fields: { type: GraphQLJSON },
        canSee: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canSeeResources)) {
                    return true;
                } else {
                    const roles = user.roles.map(x => x._id);
                    return parent.permissions.canSee.some(x => roles.includes(x));
                }
            }
        },
        canCreate: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canManageResources)) {
                    return true;
                } else {
                    const roles = user.roles.map(x => x._id);
                    return parent.permissions.canCreate.some(x => roles.includes(x));
                }
            }
        },
        canUpdate: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canManageResources)) {
                    return true;
                } else {
                    const roles = user.roles.map(x => x._id);
                    return parent.permissions.canUpdate.some(x => roles.includes(x));
                }
            }
        },
        canDelete: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canManageResources)) {
                    return true;
                } else {
                    const roles = user.roles.map(x => x._id);
                    return parent.permissions.canDelete.some(x => roles.includes(x));
                }
            }
        }
    }),
});

const FormType = new GraphQLObjectType({
    name: 'Form',
    fields: () => ({
        id: { type: GraphQLID },
        name: { type: GraphQLString },
        createdAt: { type: GraphQLString },
        modifiedAt: { type: GraphQLString },
        structure: { type: GraphQLJSON },
        status: { type: GraphQLString },
        permissions: { type: AccessType },
        resource: {
            type: ResourceType,
            resolve(parent, args) {
                return Resource.findById(parent.resource);
            },
        },
        core: {
            type: GraphQLBoolean,
            resolve(parent, args) {
                return parent.core ? parent.core : false;
            },
        },
        records: {
            type: new GraphQLList(RecordType),
            args: {
                filters: { type: GraphQLJSON },
            },
            resolve(parent, args) {
                let filters = {
                    form: parent.id
                };
                if (args.filters) {
                    for (const filter of args.filters) {
                        filters[`data.${filter.name}`] = filter.equals;
                    }
                }
                return Record.find(filters);
            },
        },
        recordsCount: {
            type: GraphQLInt,
            resolve(parent, args) {
                return Record.find({ form: parent.id }).count();
            },
        },
        versions: {
            type: new GraphQLList(FormVersionType),
            resolve(parent, args) {
                return FormVersion.find().where('_id').in(parent.versions);
            },
        },
        fields: { type: GraphQLJSON },
        canSee: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canSeeForms)) {
                    return true;
                } else {
                    const roles = user.roles.map(x => x._id);
                    return parent.permissions.canSee.some(x => roles.includes(x));
                }
            }
        },
        canCreate: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canManageForms)) {
                    return true;
                } else {
                    const roles = user.roles.map(x => x._id);
                    return parent.permissions.canCreate.some(x => roles.includes(x));
                }
            }
        },
        canUpdate: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canManageForms)) {
                    return true;
                } else {
                    const roles = user.roles.map(x => x._id);
                    return parent.permissions.canUpdate.some(x => roles.includes(x));
                }
            }
        },
        canDelete: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canManageForms)) {
                    return true;
                } else {
                    const roles = user.roles.map(x => x._id);
                    return parent.permissions.canDelete.some(x => roles.includes(x));
                }
            }
        }
    }),
});

const FormVersionType = new GraphQLObjectType({
    name: 'FormVersion',
    fields: () => ({
        id: { type: GraphQLID },
        createdAt: { type: GraphQLString },
        structure: { type: GraphQLJSON },
    }),
});

const RecordType = new GraphQLObjectType({
    name: 'Record',
    fields: () => ({
        id: { type: GraphQLID },
        createdAt: { type: GraphQLString },
        modifiedAt: { type: GraphQLString },
        deleted: { type: GraphQLBoolean },
        form: {
            type: FormType,
            resolve(parent, args) {
                return Form.findById(parent.form);
            },
        },
        data: {
            type: GraphQLJSON,
            args: {
                display: { type: GraphQLBoolean },
            },
            async resolve(parent, args) {
                if (args.display) {
                    let source = parent.resource ? await Resource.findById(parent.resource) : await Form.findById(parent.form);
                    let res = {};
                    if (source) {
                        for (let field of source.fields) {
                            let name = field.name;
                            if (parent.data[name]) {
                                res[name] = parent.data[name];
                                if (field.resource && field.displayField) {
                                    try {
                                        let record = await Record.findById(parent.data[name]);
                                        res[name] = record.data[field.displayField];
                                    } catch {
                                        res[name] = null;
                                    }
                                } else {
                                    res[name] = parent.data[name];
                                }
                            } else {
                                res[name] = null;
                            }
                        }
                        return res;
                    } else {
                        return parent.data;
                    }
                } else {
                    return parent.data;
                }
            },
        },
    }),
});

const DashboardType = new GraphQLObjectType({
    name: 'Dashboard',
    fields: () => ({
        id: { type: GraphQLID },
        name: { type: GraphQLString },
        createdAt: { type: GraphQLString },
        modifiedAt: { type: GraphQLString },
        structure: { type: GraphQLJSON },
        permissions: {
            type: AccessType,
            async resolve(parent, args) {
                const page = await Page.findOne({ content: parent.id })
                if (page) return page.permissions;
                const step = await Step.findOne({ content: parent.id })
                return step.permissions;
            }
        },
        page: {
            type: PageType,
            resolve(parent, args) {
                return Page.findOne({ content: parent.id });
            }
        },
        step: {
            type : StepType,
            resolve(parent, args) {
                return Step.findOne({ content: parent.id });
            }
        },
        canSee: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const user = context.user;
                return checkPermission(user, permissions.canSeeApplications)
            }
        },
        canUpdate: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const user = context.user;
                return checkPermission(user, permissions.canManageApplications)
            }
        },
        canDelete: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const user = context.user;
                return checkPermission(user, permissions.canManageApplications)
            }
        }
    })
});

const RoleType = new GraphQLObjectType({
    name: 'Role',
    fields: () => ({
        id: { type: GraphQLID },
        title: { type: GraphQLString },
        permissions: {
            type: new GraphQLList(PermissionType),
            resolve(parent, args) {
                return Permission.find().where('_id').in(parent.permissions);
            }
        },
        usersCount : {
            type: GraphQLInt,
            resolve(parent, args) {
                return User.find({ roles: parent.id }).count();
            }
        },
        application: {
            type: ApplicationType,
            resolve(parent, args) {
                return Application.findOne( { _id: parent.application } );
            }
        }
    })
});

const UserType = new GraphQLObjectType({
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
            resolve(parent, args) {
                return Role.find().where('_id').in(parent.roles);
            }
        },
        permissions: {
            type: new GraphQLList(PermissionType),
            async resolve(parent, args) {
                const roles = await Role.find().where('_id').in(parent.roles);
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
                for (let permission of userPermissions) {
                    if (permission.type === permissions.canSeeApplications) {
                        return Application.find();
                    }
                }
                /*  If the user does not have the permission canSeeApplications, we look for 
                    the second layer of permissions in each application.
                */
                return Application.find({'permission.canSee': { $in: parent.roles }});
            }
        }
    })
});

const ApplicationType = new GraphQLObjectType({
    name: 'Application',
    fields: () => ({
        id: { type: GraphQLID },
        name: { type: GraphQLString },
        createdAt: { type: GraphQLString },
        modifiedAt: { type: GraphQLString },
        description: { type: GraphQLString },
        status: { type: GraphQLString },
        createdBy: {
            type: UserType,
            resolve(parent, args) {
                return User.findById(parent.createdBy);
            },
        },
        pages: {
            type: new GraphQLList(PageType),
            async resolve(parent, args) {
                let pages = await Page.aggregate([
                    { '$match' : { '_id' : { '$in' : parent.pages } } },
                    { '$addFields' : { '__order' : { '$indexOfArray': [ parent.pages, '$_id' ] } } },
                    { '$sort' : { '__order' : 1 } }
                ]);
                return pages;
            }
        },
        roles: {
            type: new GraphQLList(RoleType),
            resolve(parent, args) {
                return Role.find({ application: parent.id });
            }
        },
        users: {
            type: new GraphQLList(UserType),
            resolve(parent, args) {
                return User.aggregate([
                    // Left join
                    { $lookup: {
                        from: 'roles',
                        localField: 'roles',
                        foreignField: '_id',
                        as: 'roles'
                    }},
                    // Replace the roles field with a filtered array, containing only roles that are part of the application.
                    { $addFields: {
                        roles: {
                            $filter: {
                                input: '$roles',
                                as: 'role',
                                cond: { $eq: [ '$$role.application', mongoose.Types.ObjectId(parent.id)] }
                            }
                        }
                    }},
                    // Filter users that have at least one role in the application.
                    { $match: { 'roles.0': { $exists: true }}}
                ]);
            }
        },
        usersCount : {
            type: GraphQLInt,
            async resolve(parent, args) {
                const users = await User.aggregate([
                    // Left join
                    { $lookup: {
                        from: 'roles',
                        localField: 'roles',
                        foreignField: '_id',
                        as: 'roles'
                    }},
                    // Replace the roles field with a filtered array, containing only roles that are part of the application.
                    { $addFields: {
                        roles: {
                            $filter: {
                                input: '$roles',
                                as: 'role',
                                cond: { $eq: [ '$$role.application', mongoose.Types.ObjectId(parent.id)] }
                            }
                        }
                    }},
                    // Filter users that have at least one role in the application.
                    { $match: { 'roles.0': { $exists: true }}}
                ]);
                return users.length;
            }
        },
        settings: {type: GraphQLJSON},
        permissions: {type: AccessType},
        canSee: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canSeeApplications)) {
                    return true;
                } else {
                    const roles = user.roles.map(x => x._id);
                    return parent.permissions.canSee.some(x => roles.includes(x));
                }
            }
        },
        canCreate: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canManageApplications)) {
                    return true;
                } else {
                    const roles = user.roles.map(x => x._id);
                    return parent.permissions.canCreate.some(x => roles.includes(x));
                }
            }
        },
        canUpdate: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canManageApplications)) {
                    return true;
                } else {
                    const roles = user.roles.map(x => x._id);
                    return parent.permissions.canUpdate.some(x => roles.includes(x));
                }
            }
        },
        canDelete: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canManageApplications)) {
                    return true;
                } else {
                    const roles = user.roles.map(x => x._id);
                    return parent.permissions.canDelete.some(x => roles.includes(x));
                }
            }
        }
    })
});

const PageType = new GraphQLObjectType({
    name: 'Page',
    fields: () => ({
        id: { 
            type: GraphQLID,
            resolve(parent, args) {
                return parent._id;
            }
        },
        name: { type: GraphQLString },
        createdAt: { type: GraphQLString },
        modifiedAt: { type: GraphQLString },
        type: { type: ContentEnumType },
        content: { type: GraphQLID },
        permissions: { type: AccessType },
        application: { 
            type: ApplicationType,
            resolve(parent, args) {
                return Application.findOne( { pages: parent.id } );
            }
        },
        canSee: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canSeeApplications)) {
                    return true;
                } else {
                    const roles = user.roles.map(x => x._id);
                    return parent.permissions.canSee.some(x => roles.includes(x));
                }
            }
        },
        canUpdate: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canManageApplications)) {
                    return true;
                } else {
                    const roles = user.roles.map(x => x._id);
                    return parent.permissions.canUpdate.some(x => roles.includes(x));
                }
            }
        },
        canDelete: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canManageApplications)) {
                    return true;
                } else {
                    const roles = user.roles.map(x => x._id);
                    return parent.permissions.canDelete.some(x => roles.includes(x));
                }
            }
        }
    })
});

const WorkflowType = new GraphQLObjectType({
    name: 'Workflow',
    fields: () => ({
        id: { type: GraphQLID },
        name: { type: GraphQLString },
        createdAt: { type: GraphQLString },
        modifiedAt: { type: GraphQLString },
        steps: {
            type: new GraphQLList(StepType),
            async resolve(parent, args) {
                let steps = await Step.aggregate([
                    { '$match' : { '_id' : { '$in' : parent.steps } } },
                    { '$addFields' : { '__order' : { '$indexOfArray': [ parent.steps, '$_id' ] } } },
                    { '$sort' : { '__order' : 1 } }
                ]);
                return steps;
            }
        },
        permissions: {
            type: AccessType,
            async resolve(parent, args) {
                const page = await Page.findOne({ content: parent.id })
                return page.permissions;
            }
        },
        page: {
            type: PageType,
            resolve(parent, args) {
                return Page.findOne({ content: parent.id });
            }
        }
    })
});

const StepType = new GraphQLObjectType({    
    name: 'Step',
    fields: () => ({
        id: { 
            type: GraphQLID,
            resolve(parent, args) {
                return parent._id;
            }
        },
        name: { type: GraphQLString },
        createdAt: { type: GraphQLString },
        modifiedAt: { type: GraphQLString },
        type: {type: ContentEnumType},
        content: { type: GraphQLID },
        permissions: { type: AccessType },
        workflow: {
            type: WorkflowType,
            resolve(parent, args) {
                return Workflow.findOne({ steps: parent.id });
            }
        },
        canSee: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canSeeApplications)) {
                    return true;
                } else {
                    const roles = user.roles.map(x => x._id);
                    return parent.permissions.canSee.some(x => roles.includes(x));
                }
            }
        },
        canUpdate: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canManageApplications)) {
                    return true;
                } else {
                    const roles = user.roles.map(x => x._id);
                    return parent.permissions.canUpdate.some(x => roles.includes(x));
                }
            }
        },
        canDelete: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canManageApplications)) {
                    return true;
                } else {
                    const roles = user.roles.map(x => x._id);
                    return parent.permissions.canDelete.some(x => roles.includes(x));
                }
            }
        }
    })
});

const NotificationType = new GraphQLObjectType({
    name: 'Notification',
    fields: () => ({
        action: { type: GraphQLString },
        content: { type: GraphQLJSON },
        createdAt: { type: GraphQLString }
    })
});

module.exports = {
    PermissionType,
    AccessType,
    ResourceType,
    FormType,
    FormVersionType,
    RecordType,
    DashboardType,
    RoleType,
    UserType,
    ApplicationType,
    PageType,
    WorkflowType,
    StepType,
    NotificationType
};
