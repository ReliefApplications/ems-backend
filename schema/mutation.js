/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
const graphql = require('graphql');
const mongoose = require('mongoose');
const Form = require('../models/form');
const FormVersion = require('../models/form-version');
const Resource = require('../models/resource');
const Record = require('../models/record');
const Dashboard = require('../models/dashboard');
const User = require('../models/user');
const Role = require('../models/role');
const Application = require('../models/application');
const Page = require('../models/page');
const Workflow = require('../models/workflow');
const Step = require('../models/step');
const extractFields = require('../utils/extractFields');
const findDuplicates = require('../utils/findDuplicates');
const checkPermission = require('../utils/checkPermission');
const deleteContent = require('../services/deleteContent');
const permissions = require('../const/permissions');
const errors = require('../const/errors');
const pubsub = require('../server/pubsub');
const {
    ContentEnumType,
    contentType
} = require('../const/contentType');

const {
    GraphQLNonNull,
    GraphQLObjectType,
    GraphQLString,
    GraphQLID,
    GraphQLBoolean,
    GraphQLList,
} = graphql;

const { GraphQLJSON } = require('graphql-type-json');
const { GraphQLError } = require('graphql/error');

const {
    ResourceType,
    FormType,
    RecordType,
    DashboardType,
    RoleType,
    UserType,
    ApplicationType,
    PageType,
    WorkflowType,
    StepType
} = require('./types');

// === MUTATIONS ===
const Mutation = new GraphQLObjectType({
    name: 'Mutation',
    fields: {
        addResource: {
            /*  Creates a new resource.
                Throws GraphQL error if not logged or authorized.
            */
            type: ResourceType,
            args: {
                name: { type: new GraphQLNonNull(GraphQLString) },
                fields: { type: new GraphQLNonNull(new GraphQLList(GraphQLJSON)) },
            },
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canManageResources)) {
                    let resource = new Resource({
                        name: args.name,
                        createdAt: new Date(),
                        fields: args.fields,
                        permissions: {
                            canSee: [],
                            canCreate: [],
                            canUpdate: [],
                            canDelete: []
                        }
                    });
                    return resource.save();
                } else {
                    throw new GraphQLError(errors.permissionNotGranted);
                }
            },
        },
        editResource: {
            /*  Edits an existing resource.
                Throws GraphQL error if not logged or authorized.
            */
            type: ResourceType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) },
                fields: { type: new GraphQLList(GraphQLJSON) },
                permissions: { type: GraphQLJSON }
            },
            resolve(parent, args, context) {
                if (!args || (!args.fields && !args.permissions)) {
                    throw new GraphQLError(errors.invalidEditResourceArguments);
                } else {
                    let update = {};
                    Object.assign(update,
                        args.fields && { fields: args.fields },
                        args.permissions && { permissions: args.permissions }
                    );
                    const user = context.user;
                    if (checkPermission(user, permissions.canManageResources)) {
                        return Resource.findByIdAndUpdate(
                            args.id,
                            update,
                            { new: true }
                        );
                    } else {
                        const filters = {
                            'permissions.canUpdate': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                            _id: args.id
                        };
                        return Resource.findOneAndUpdate(
                            filters,
                            update,
                            { new: true }
                        );
                    }
                }
            },
        },
        deleteResource: {
            /*  Deletes a resource from its id.
                Throws GraphQL error if not logged or authorized.
            */
            type: ResourceType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) },
            },
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canManageResources)) {
                    return Resource.findByIdAndRemove(args.id);
                } else {
                    const filters = {
                        'permissions.canDelete': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                        _id: args.id
                    };
                    return Resource.findOneAndRemove(filters);
                }
            },
        },
        // TODO: check permission to add form
        addForm: {
            type: FormType,
            args: {
                name: { type: new GraphQLNonNull(GraphQLString) },
                newResource: { type: GraphQLBoolean },
                resource: { type: GraphQLID },
            },
            async resolve(parent, args) {
                if (args.newResource && args.resource) {
                    throw new GraphQLError(errors.invalidAddFormArguments);
                }
                try {
                    if (args.resource || args.newResource) {
                        if (args.newResource) {
                            let resource = new Resource({
                                name: args.name,
                                createdAt: new Date(),
                                permissions: {
                                    canSee: [],
                                    canCreate: [],
                                    canUpdate: [],
                                    canDelete: []
                                }
                            });
                            await resource.save();
                            let form = new Form({
                                name: args.name,
                                createdAt: new Date(),
                                status: 'pending',
                                resource: resource,
                                core: true,
                                permissions: {
                                    canSee: [],
                                    canCreate: [],
                                    canUpdate: [],
                                    canDelete: []
                                }
                            });
                            return form.save();
                        } else {
                            let resource = await Resource.findById(args.resource);
                            let form = new Form({
                                name: args.name,
                                createdAt: new Date(),
                                status: 'pending',
                                resource: resource,
                                permissions: {
                                    canSee: [],
                                    canCreate: [],
                                    canUpdate: [],
                                    canDelete: []
                                }
                            });
                            return form.save();
                        }
                    }
                    else {
                        let form = new Form({
                            name: args.name,
                            createdAt: new Date(),
                            status: 'pending',
                            permissions: {
                                canSee: [],
                                canCreate: [],
                                canUpdate: [],
                                canDelete: []
                            }
                        });
                        return form.save();
                    }
                } catch (error) {
                    throw new GraphQLError(errors.resourceDuplicated);
                }
            },
        },
        // TODO: check permission to edit form
        editForm: {
            /*  Finds form from its id and update it, if user is authorized.
                Throws an error if not logged or authorized, or arguments are invalid.
            */
            type: FormType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) },
                structure: { type: GraphQLJSON },
                status: { type: GraphQLString },
                name: { type: GraphQLString },
                permissions: { type: GraphQLJSON }
            },
            async resolve(parent, args) {
                let form = await Form.findById(args.id);
                let resource = null;
                if (form.resource && args.structure) {
                    let structure = JSON.parse(args.structure);
                    resource = await Resource.findById(form.resource);
                    let fields = [];
                    for (let page of structure.pages) {
                        await extractFields(page, fields);
                        findDuplicates(fields);
                    }
                    let oldFields = resource.fields;
                    if (!form.core) {
                        for (const field of oldFields.filter(
                            (x) => x.isRequired === true
                        )) {
                            if (
                                !fields.find(
                                    (x) => x.name === field.name && x.isRequired === true
                                )
                            ) {
                                throw new GraphQLError(
                                    `Missing required core field for that resource: ${field.name}`
                                );
                            }
                        }
                    }
                    for (const field of fields) {
                        let oldField = oldFields.find((x) => x.name === field.name);
                        if (!oldField) {
                            oldFields.push({
                                type: field.type,
                                name: field.name,
                                resource: field.resource,
                                displayField: field.displayField,
                                isRequired: form.core && field.isRequired ? true : false,
                            });
                        } else {
                            if (form.core && oldField.isRequired !== field.isRequired) {
                                oldField.isRequired = field.isRequired;
                            }
                        }
                    }
                    await Resource.findByIdAndUpdate(form.resource, {
                        fields: oldFields,
                    });
                }
                let version = new FormVersion({
                    createdAt: form.modifiedAt ? form.modifiedAt : form.createdAt,
                    structure: form.structure,
                    form: form.id,
                });
                let update = {
                    modifiedAt: new Date(),
                    $push: { versions: version },
                };
                if (args.structure) {
                    update.structure = args.structure;
                    let structure = JSON.parse(args.structure);
                    let fields = [];
                    for (let page of structure.pages) {
                        await extractFields(page, fields);
                        findDuplicates(fields);
                    }
                    update.fields = fields;
                }
                if (args.status) {
                    update.status = args.status;
                }
                if (args.name) {
                    update.name = args.name;
                }
                if (args.permissions) {
                    update.permissions = args.permissions;
                }
                form = Form.findByIdAndUpdate(
                    args.id,
                    update,
                    { new: true },
                    () => {
                        version.save();
                    }
                );
                return form;
            },
        },
        deleteForm: {
            /*  Finds form from its id and delete it, and all records associated, if user is authorized.
                Throws an error if not logged or authorized, or arguments are invalid.
            */
            type: FormType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) },
            },
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canManageForms)) {
                    return Form.findByIdAndRemove(args.id, () => {
                        // Also deletes the records associated to that form.
                        Record.remove({ form: args.id }).exec();
                    });
                } else {
                    const filters = {
                        'permissions.canDelete': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                        _id: args.id
                    };
                    return Form.findOneAndRemove(filters, () => {
                        // Also deletes the records associated to that form.
                        Record.remove({ form: args.id }).exec();
                    });
                }
            },
        },
        addRecord: {
            /*  Adds a record to a form, if user authorized.
                Throws a GraphQL error if not logged or authorized, or form not found.
            */
            type: RecordType,
            args: {
                form: { type: GraphQLID },
                data: { type: new GraphQLNonNull(GraphQLJSON) },
            },
            async resolve(parent, args, context) {
                const user = context.user;
                let form = null;
                if (checkPermission(user, permissions.canManageForms)) {
                    form = await Form.findById(args.form);
                    if (!form) throw new GraphQLError(errors.dataNotFound);
                } else {
                    const filters = {
                        'permissions.canCreate': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                        _id: args.form
                    };
                    form = await Form.findOne(filters);
                    if (!form) throw new GraphQLError(errors.permissionNotGranted);
                }
                let record = new Record({
                    form: args.form,
                    createdAt: new Date(),
                    modifiedAt: new Date(),
                    data: args.data,
                    resource: form.resource ? form.resource : null,
                });
                return record.save();
            },
        },
        // TODO: check permission to edit record
        editRecord: {
            type: RecordType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) },
                data: { type: new GraphQLNonNull(GraphQLJSON) },
            },
            async resolve(parent, args) {
                let oldRecord = await Record.findById(args.id);
                let record = Record.findByIdAndUpdate(
                    args.id,
                    {
                        data: { ...oldRecord.data, ...args.data },
                        modifiedAt: new Date(),
                    },
                    { new: true }
                );
                return record;
            },
        },
        // TODO: check permission to delete record
        deleteRecord: {
            /*  Delete a record, if user has permission to update associated form / resource.
                Throw an error if not logged or authorized.
            */
            type: RecordType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) },
            },
            resolve(parent, args, context) {
                const user = context.user;
                return Record.findByIdAndRemove(args.id);
            },
        },
        addDashboard: {
            /*  Creates a new dashboard.
                Throws an error if not logged or authorized, or arguments are invalid.
            */
            type: DashboardType,
            args: {
                name: { type: new GraphQLNonNull(GraphQLString) },
            },
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canManageDashboards)) {
                    if (args.name !== '') {
                        let dashboard = new Dashboard({
                            name: args.name,
                            createdAt: new Date(),
                            permissions: {
                                canSee: [],
                                canCreate: [],
                                canUpdate: [],
                                canDelete: []
                            }
                        });
                        return dashboard.save();
                    }
                    throw new GraphQLError(errors.invalidAddDashboardArguments);
                } else {
                    throw new GraphQLError(errors.permissionNotGranted);
                }
            },
        },
        editDashboard: {
            /*  Finds dashboard from its id and update it, if user is authorized.
                Throws an error if not logged or authorized, or arguments are invalid.
            */
            type: DashboardType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) },
                structure: { type: GraphQLJSON },
                name: { type: GraphQLString },
                permissions: { type: GraphQLJSON }
            },
            async resolve(parent, args, context) {
                if (!args || (!args.name && !args.structure && !args.permissions)) {
                    throw new GraphQLError(errors.invalidEditDashboardArguments);
                } else {
                    const user = context.user;
                    let update = {
                        modifiedAt: new Date()
                    };
                    Object.assign(update,
                        args.structure && { structure: args.structure },
                        args.name && { name: args.name },
                        args.permissions && { permissions: args.permissions }
                    );
                    if (checkPermission(user, permissions.canManageDashboards)) {
                        let dashboard = await Dashboard.findByIdAndUpdate(
                            args.id,
                            update,
                            { new: true }
                        );
                        update = {
                            modifiedAt: dashboard.modifiedAt,
                            name: dashboard.name,
                            permissions: dashboard.permissions
                        };
                        await Page.findOneAndUpdate(
                            { content: dashboard.id },
                            update
                        );
                        await Step.findOneAndUpdate(
                            { content: dashboard.id },
                            update
                        );
                        return dashboard;
                    } else {
                        const filters = {
                            'permissions.canUpdate': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                            _id: args.id
                        };
                        let dashboard = await Dashboard.findOneAndUpdate(
                            filters,
                            update,
                            { new: true }
                        );
                        update = {
                            modifiedAt: dashboard.modifiedAt,
                            name: dashboard.name,
                            permissions: dashboard.permissions
                        };
                        await Page.findOneAndUpdate(
                            { content: dashboard.id },
                            update
                        );
                        await Step.findOneAndUpdate(
                            { content: dashboard.id },
                            update
                        );
                        return dashboard;
                    }
                }
            },
        },
        deleteDashboard: {
            /*  Finds dashboard from its id and delete it, if user is authorized.
                Throws an error if not logged or authorized.
            */
            type: DashboardType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) },
            },
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canManageDashboards)) {
                    return Dashboard.findByIdAndDelete(args.id);
                } else {
                    const filters = {
                        'permissions.canDelete': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                        _id: args.id
                    };
                    return Dashboard.findOneAndDelete(filters);
                }
            },
        },
        addRole: {
            /*  Creates a new role.
                Throws an error if not logged or authorized.
            */
            type: RoleType,
            args: {
                title: { type: new GraphQLNonNull(GraphQLString) },
                application: { type: GraphQLID }
            },
            async resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canSeeRoles)) {
                    let role = new Role({
                        title: args.title
                    });
                    if (args.application) {
                        let application = await Application.findById(args.application);
                        if (!application) throw new GraphQLError(errors.dataNotFound);
                        role.application = args.application;
                    }
                    return role.save();
                } else {
                    throw new GraphQLError(errors.permissionNotGranted);
                }
            },
        },
        editRole: {
            /*  Edits a role's admin permissions, providing its id and the list of admin permissions.
                Throws an error if not logged or authorized.
            */
            type: RoleType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) },
                permissions: { type: new GraphQLNonNull(new GraphQLList(GraphQLID)) }
            },
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canSeeRoles)) {
                    return Role.findByIdAndUpdate(
                        args.id,
                        {
                            permissions: args.permissions
                        },
                        { new: true }
                    );
                } else {
                    throw new GraphQLError(errors.permissionNotGranted);
                }
            }
        },
        deleteRole: {
            /*  Deletes a role.
                Throws an error if not logged or authorized.
            */
            type: RoleType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) }
            },
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canSeeRoles)) {
                    return Role.findByIdAndDelete(args.id);
                } else {
                    throw new GraphQLError(errors.permissionNotGranted);
                }
            }
        },
        editUser: {
            /*  Edits an user's roles, providing its id and the list of roles.
                Throws an error if not logged or authorized.
            */
            type: UserType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) },
                roles: { type: new GraphQLNonNull(new GraphQLList(GraphQLID)) },
                application: { type: GraphQLID }
            },
            async resolve(parent, args, context) {
                const user = context.user;
                let roles = args.roles;
                if (checkPermission(user, permissions.canSeeUsers)) {
                    if (args.application) {
                        const userRoles = await User.findById(args.id).populate({
                            path: 'roles',
                            match: { application: { $ne: args.application } } // Only returns roles not attached to the application
                        });
                        roles = userRoles.roles.map(x => x._id).concat(roles);
                        return User.findByIdAndUpdate(
                            args.id,
                            {
                                roles: roles,
                            },
                            { new: true }
                        ).populate({
                            path: 'roles',
                            match: { application: args.application } // Only returns roles attached to the application
                        });
                    } else {
                        return User.findByIdAndUpdate(
                            args.id,
                            {
                                roles: roles,
                            },
                            { new: true }
                        );
                    }
                } else {
                    throw new GraphQLError(errors.permissionNotGranted);
                }
            },
        },
        addRoleToUser: {
            type: UserType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) },
                role: { type: new GraphQLNonNull(GraphQLID) }
            },
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canSeeUsers)) {
                    return User.findByIdAndUpdate(
                        args.id,
                        {
                            $push: { roles: args.role },
                        },
                        { new: true }
                    );
                } else {
                    throw new GraphQLError(errors.permissionNotGranted);
                }
            }
        },
        addApplication: {
            /*  Creates a new application.
                Throws an error if not logged or authorized, or arguments are invalid.
            */
            type: ApplicationType,
            args: {
                name: { type: new GraphQLNonNull(GraphQLString) }
            },
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canManageApplications)) {
                    if (args.name !== '') {
                        let application = new Application({
                            name: args.name,
                            createdAt: new Date(),
                            status: 'pending',
                            createdBy: user.id,
                            permissions: {
                                canSee: [],
                                canCreate: [],
                                canUpdate: [],
                                canDelete: []
                            }
                        });
                        return application.save((err, doc) => {
                            pubsub.publish('notification', { 
                                notification: {
                                    action: 'Application created',
                                    content: doc,
                                    createdAt: new Date()
                                }
                            });
                        });
                    }
                    throw new GraphQLError(errors.invalidAddApplicationArguments);
                } else {
                    throw new GraphQLError(errors.permissionNotGranted);
                }
            }
        },
        editApplication: {
            /*  Finds application from its id and update it, if user is authorized.
                Throws an error if not logged or authorized, or arguments are invalid.
            */
            type: ApplicationType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) },
                description: { type: GraphQLString },
                name: { type: GraphQLString },
                status: { type: GraphQLString },
                pages: { type: new GraphQLList(GraphQLID) },
                settings: { type: GraphQLJSON },
                permissions: { type: GraphQLJSON }
            },
            resolve(parent, args, context) {
                if (!args || (!args.name && !args.status && !args.pages && !args.settings && !args.permissions)) {
                    throw new GraphQLError(errors.invalidEditApplicationArguments);
                } else {
                    let update = {};
                    Object.assign(update,
                        args.name && { name: args.name },
                        args.description && {description: args.description },
                        args.status && { status: args.status },
                        args.pages && { pages: args.pages },
                        args.settings && { settings: args.settings },
                        args.permissions && { permissions: args.permissions }
                    );
                    const user = context.user;
                    if (checkPermission(user, permissions.canManageApplications)) {
                        return Application.findByIdAndUpdate(
                            args.id,
                            update,
                            { new: true }
                        );
                    } else {
                        const filters = {
                            'permissions.canUpdate': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                            _id: args.id
                        };
                        return Application.findOneAndUpdate(
                            filters,
                            update,
                            { new: true }
                        );
                    }
                }
            }
        },
        deleteApplication: {
            /*  Deletes an application from its id. 
                Recursively delete associated pages and dashboards/workflows.
                Throw GraphQLError if not authorized.
            */
            type: ApplicationType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) }
            },
            async resolve(parent, args, context) {
                const user = context.user;
                let application = null;
                if (checkPermission(user, permissions.canManageApplications)) {
                    application = await Application.findByIdAndDelete(args.id, (err, doc) => {
                        pubsub.publish('notification', { 
                            notification: {
                                action: 'Application deleted',
                                content: doc,
                                createdAt: new Date()
                            }
                        });
                    });
                } else {
                    const filters = {
                        'permissions.canDelete': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                        _id: args.id
                    };
                    application = await Application.findOneAndDelete(filters, (err, doc) => {
                        pubsub.publish('notification', { 
                            notification: {
                                action: 'Application deleted',
                                content: doc,
                                createdAt: new Date()
                            }
                        });
                    });
                }
                if (!application) throw GraphQLError(errors.permissionNotGranted);
                if (application.pages.length) {
                    for (pageID of application.pages) {
                        let page = await Page.findByIdAndDelete(pageID);
                        await deleteContent(page);
                    }
                }
                return application;
            }
        },
        addPage: {
            /*  Creates a new page linked to an existing application.
                Creates also the linked Workflow or Dashboard. If it's a Form, the user must give its ID.
                Throws an error if not logged or authorized, or arguments are invalid.
            */
            type: PageType,
            args: {
                name: { type: GraphQLString },
                type: { type: new GraphQLNonNull(GraphQLString) },
                content: { type: GraphQLID },
                application: { type: new GraphQLNonNull(GraphQLID) }
            },
            async resolve(parent, args, context) {
                if (!args.application || !(args.type in contentType)) {
                    throw new GraphQLError(errors.invalidAddPageArguments);
                } else {
                    const user = context.user;
                    if (checkPermission(user, permissions.canManageApplications)) {
                        let application = await Application.findById(args.application);
                        if (!application) throw new GraphQLError(errors.dataNotFound);
                        // Create the linked Workflow or Dashboard
                        let content = args.content;
                        switch (args.type) {
                            case contentType.workflow: {
                                let workflow = new Workflow({
                                    name: args.name,
                                    createdAt: new Date(),
                                    permissions: {
                                        canSee: [],
                                        canCreate: [],
                                        canUpdate: [],
                                        canDelete: []
                                    }
                                });
                                await workflow.save();
                                content = workflow._id;
                                break;
                            }
                            case contentType.dashboard: {
                                let dashboard = new Dashboard({
                                    name: args.name,
                                    createdAt: new Date(),
                                    permissions: {
                                        canSee: [],
                                        canCreate: [],
                                        canUpdate: [],
                                        canDelete: []
                                    }
                                });
                                await dashboard.save();
                                content = dashboard._id;
                                break;
                            }
                            case contentType.form: {
                                let form = await Form.findById(content);
                                if (!form) {
                                    throw new GraphQLError(errors.dataNotFound);
                                }
                                break;
                            }
                            default:
                                break;
                        }
                        // Create a new page.
                        let page = new Page({
                            name: args.name,
                            createdAt: new Date(),
                            type: args.type,
                            content: content,
                            permissions: {
                                canSee: [],
                                canCreate: [],
                                canUpdate: [],
                                canDelete: []
                            }
                        });
                        await page.save();
                        // Link the new page to the corresponding application by updating this application.
                        let update = {
                            modifiedAt: new Date(),
                            $push: { pages: page.id },
                        };
                        await Application.findByIdAndUpdate(
                            args.application,
                            update,
                        );
                        return page;
                    } else {
                        throw new GraphQLError(errors.permissionNotGranted);
                    }
                }
            }
        },
        editPage: {
            /*  Finds a page from its id and update it, if user is authorized.
                Update also the name and permissions of the linked content if it's not a form.
                Throws an error if not logged or authorized, or arguments are invalid.
            */
            type: PageType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) },
                name: { type: GraphQLString },
                permissions: { type: GraphQLJSON }
            },
            async resolve(parent, args, context) {
                if (!args || (!args.name && !args.permissions)) throw new GraphQLError(errors.invalidEditPageArguments);
                const user = context.user;
                let update = {
                    modifiedAt: new Date()
                };
                Object.assign(update,
                    args.name && { name: args.name },
                    args.permissions && { permissions: args.permissions }
                );
                let page = null;
                if (checkPermission(user, permissions.canManageDashboards)) {
                    page = await Page.findByIdAndUpdate(
                        args.id,
                        update,
                        { new: true }
                    );

                } else {
                    const filters = {
                        'permissions.canUpdate': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                        _id: args.id
                    };
                    page = await Page.findOneAndUpdate(
                        filters,
                        update,
                        { new: true }
                    );
                }
                if (!page) throw GraphQLError(errors.dataNotFound);
                switch (page.type) {
                    case contentType.workflow:
                        await Workflow.findByIdAndUpdate(page.content, update);
                        break;
                    case contentType.dashboard:
                        await Dashboard.findByIdAndUpdate(page.content, update);
                        break;
                    default:
                        break;
                }
                return page;
            }
        },
        deletePage: {
            /*  Delete a page from its id and erase its reference in the corresponding application.
                Also delete recursively the linked Workflow or Dashboard
                Throws an error if not logged or authorized, or arguments are invalid.
            */
            type: PageType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) }
            },
            async resolve(parent, args, context) {
                const user = context.user;
                let page = null;
                if (checkPermission(user, permissions.canManageApplications)) {
                    page = await Page.findByIdAndDelete(args.id);
                } else {
                    const filters = {
                        'permissions.canDelete': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                        _id: args.id
                    };
                    page = await Page.findOneAndDelete(filters);
                }
                if (!page) throw new GraphQLError(errors.permissionNotGranted);
                let application = await Application.findOne({ pages: args.id });
                if (!application) throw new GraphQLError(errors.dataNotFound);
                let update = {
                    modifiedAt: new Date(),
                    $pull: { pages: args.id }
                };
                await Application.findByIdAndUpdate(
                    application.id,
                    update,
                    { new: true }
                );
                await deleteContent(page);
                return page;
            }
        },
        addWorkflow: {
            /*  Creates a new workflow linked to an existing page.
                Throws an error if not logged or authorized, or arguments are invalid.
            */
            type: WorkflowType,
            args: {
                name: { type: GraphQLString },
                page: { type: new GraphQLNonNull(GraphQLID) }
            },
            async resolve(parent, args, context) {
                if (!args.page) {
                    throw new GraphQLError(errors.invalidAddWorkflowArguments);
                } else {
                    const user = context.user;
                    if (checkPermission(user, permissions.canManageApplications)) {
                        let page = await Page.findById(args.page);
                        if (!page) throw new GraphQLError(errors.dataNotFound);
                        if (page.type !== contentType.workflow) throw new GraphQLError(errors.pageTypeError);
                        // Create a workflow.
                        let workflow = new Workflow({
                            name: args.name,
                            createdAt: new Date(),
                            permissions: {
                                canSee: [],
                                canCreate: [],
                                canUpdate: [],
                                canDelete: []
                            }
                        });
                        await workflow.save();
                        // Link the new workflow to the corresponding page by updating this page.
                        let update = {
                            modifiedAt: new Date(),
                            content: workflow._id,
                        };
                        await Page.findByIdAndUpdate(
                            args.page,
                            update,
                        );
                        return workflow;
                    } else {
                        throw new GraphQLError(errors.permissionNotGranted);
                    }
                }
            }
        },
        editWorkflow: {
            /*  Finds a workflow from its id and update it, if user is authorized.
                Throws an error if not logged or authorized, or arguments are invalid.
            */
            type: WorkflowType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) },
                name: { type: GraphQLString },
                steps: { type: new GraphQLList(GraphQLID) },
                permissions: { type: GraphQLJSON }
            },
            resolve(parent, args, context) {
                if (!args || (!args.name && !args.steps && !args.permissions)) {
                    throw new GraphQLError(errors.invalidEditWorkflowArguments);
                } else {
                    const user = context.user;
                    let update = {
                        modifiedAt: new Date()
                    };
                    Object.assign(update,
                        args.name && { name: args.name },
                        args.steps && { steps: args.steps },
                        args.permissions && { permissions: args.permissions }
                    );
                    if (checkPermission(user, permissions.canManageDashboards)) {
                        return Workflow.findByIdAndUpdate(
                            args.id,
                            update,
                            { new: true }
                        );
                    } else {
                        const filters = {
                            'permissions.canUpdate': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                            _id: args.id
                        };
                        return Workflow.findOneAndUpdate(
                            filters,
                            update,
                            { new: true }
                        );
                    }
                }

            }
        },
        deleteWorkflow: {
            /*  Delete a workflow from its id and recursively delete steps
                Throws an error if not logged or authorized, or arguments are invalid.
            */
            type: WorkflowType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) },
            },
            async resolve(parent, args, context) {
                const user = context.user;
                let workflow = null;
                if (checkPermission(user, permissions.canManageApplications)) {
                    workflow = await Workflow.findByIdAndDelete(args.id);
                } else {
                    const filters = {
                        'permissions.canDelete': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                        _id: args.id
                    };
                    workflow = await Workflow.findOneAndDelete(
                        filters,
                    );
                }
                if (!workflow) throw new GraphQLError(errors.permissionNotGranted);
                for (let step of workflow.steps) {
                    await Step.findByIdAndDelete(step.id);
                    await deleteContent(step);
                }
                return workflow;
            }
        },
        addStep: {
            /*  Creates a new step linked to an existing workflow.
                Creates also the associated Dashboard if it's the step's type.
                Throws an error if not logged or authorized, or arguments are invalid.
            */
            type: StepType,
            args: {
                name: { type: GraphQLString },
                type: { type: new GraphQLNonNull(GraphQLString) },
                content: { type: GraphQLID },
                workflow: { type: new GraphQLNonNull(GraphQLID) }
            },
            async resolve(parent, args, context) {
                if (!args.workflow || !(args.type in contentType)) {
                    throw new GraphQLError(errors.invalidAddStepArguments);
                } else {
                    const user = context.user;
                    if (checkPermission(user, permissions.canManageApplications)) {
                        let workflow = await Workflow.findById(args.workflow);
                        if (!workflow) throw new GraphQLError(errors.dataNotFound);
                        // Create a linked Dashboard if necessary
                        if (args.type === contentType.dashboard) {
                            let dashboard = new Dashboard({
                                name: args.name,
                                createdAt: new Date(),
                                permissions: {
                                    canSee: [],
                                    canCreate: [],
                                    canUpdate: [],
                                    canDelete: []
                                }
                            });
                            await dashboard.save();
                            args.content = dashboard._id;
                        }
                        // Create a new step.
                        let step = new Step({
                            name: args.name,
                            createdAt: new Date(),
                            type: args.type,
                            content: args.content,
                            permissions: {
                                canSee: [],
                                canCreate: [],
                                canUpdate: [],
                                canDelete: []
                            }
                        });
                        await step.save();
                        // Link the new step to the corresponding application by updating this application.
                        let update = {
                            modifiedAt: new Date(),
                            $push: { steps: step.id },
                        };
                        await Workflow.findByIdAndUpdate(
                            args.workflow,
                            update,
                        );
                        return step;
                    } else {
                        throw new GraphQLError(errors.permissionNotGranted);
                    }
                }
            }
        },
        editStep: {
            /*  Finds a step from its id and update it, if user is authorized.
                Throws an error if not logged or authorized, or arguments are invalid.
            */
            type: StepType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) },
                name: { type: GraphQLString },
                type: { type: GraphQLString },
                content: { type: GraphQLID },
                permissions: { type: GraphQLJSON }
            },
            async resolve(parent, args, context) {
                if (!args || (!args.name && !args.type && !args.content && !args.permissions)) {
                    throw new GraphQLError(errors.invalidEditStepArguments);
                } else if (args.content) {
                    let content = null;
                    switch (args.type) {
                        case contentType.dashboard:
                            content = await Dashboard.findById(args.content);
                            break;
                        case contentType.form:
                            content = await Form.findById(args.content);
                            break;
                        default:
                            break;
                    }
                    if (!content) throw new GraphQLError(errors.dataNotFound);
                }
                const user = context.user;
                let update = {
                    modifiedAt: new Date()
                };
                Object.assign(update,
                    args.name && { name: args.name },
                    args.type && { type: args.type },
                    args.content && { content: args.content },
                    args.permissions && { permissions: args.permissions }
                );
                let step = null;
                if (checkPermission(user, permissions.canManageDashboards)) {
                    step = await Step.findByIdAndUpdate(
                        args.id,
                        update,
                        { new: true }
                    );
                } else {
                    const filters = {
                        'permissions.canUpdate': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                        _id: args.id
                    };
                    step = await Step.findOneAndUpdate(
                        filters,
                        update,
                        { new: true }
                    );
                }
                if (!step) throw GraphQLError(errors.dataNotFound);
                if (step.type === contentType.dashboard) {
                    let update = {
                        modifiedAt: new Date(),
                    };
                    Object.assign(update,
                        args.name && { name: args.name },
                        args.permissions && { permissions: args.permissions }
                    );
                    await Dashboard.findByIdAndUpdate(step.content, update);
                }
                return step;
            }
        },
        deleteStep: {
            /*  TODO : Check permissions of the step and the workflow to know if the user can delete
            it even if he has not permissions.canManageApplications
            */
            /*  Delete a step from its id and erase its reference in the corresponding workflow.
                Delete also the linked dashboard if it has one.
                Throws an error if not logged or authorized, or arguments are invalid.
            */
            type: StepType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) }
            },
            async resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canManageApplications)) {
                    let workflow = await Workflow.findOne({ steps: args.id });
                    if (!workflow) throw new GraphQLError(errors.dataNotFound);
                    let update = {
                        modifiedAt: new Date(),
                        $pull: { steps: args.id }
                    };
                    await Workflow.findByIdAndUpdate(
                        workflow.id,
                        update,
                        { new: true }
                    );
                    let step = await Step.findByIdAndDelete(args.id);
                    await deleteContent(step);
                    return step;
                } else {
                    throw new GraphQLError(errors.permissionNotGranted);
                }
            }
        },
    }
});

module.exports = Mutation;