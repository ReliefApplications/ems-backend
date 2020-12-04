import {
    GraphQLNonNull,
    GraphQLObjectType,
    GraphQLString,
    GraphQLID,
    GraphQLBoolean,
    GraphQLList,
} from 'graphql';
import mongoose from 'mongoose';
import Form from '../../models/form';
import FormVersion from '../../models/form-version';
import Resource from '../../models/resource';
import Record from '../../models/record';
import Dashboard from '../../models/dashboard';
import User from '../../models/user';
import Role from '../../models/role';
import Application from '../../models/application';
import Page from '../../models/page';
import Workflow from '../../models/workflow';
import Step from '../../models/step';
import extractFields from '../../utils/extractFields';
import findDuplicates from '../../utils/findDuplicates';
import checkPermission from '../../utils/checkPermission';
import deleteContent from '../../services/deleteContent';
import permissions from '../../const/permissions';
import errors from '../../const/errors';
import pubsub from '../../server/pubsub';
import { contentType } from '../../const/contentType';

import { GraphQLJSON } from 'graphql-type-json';
import { GraphQLError } from 'graphql/error';

import { ResourceType, FormType, RecordType, DashboardType, RoleType, UserType, ApplicationType, PageType, WorkflowType, StepType } from '../types';

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
                    const resource = new Resource({
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
                    const update = {};
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
                            const resource = new Resource({
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
                            const form = new Form({
                                name: args.name,
                                createdAt: new Date(),
                                status: 'pending',
                                resource,
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
                            const resource = await Resource.findById(args.resource);
                            const form = new Form({
                                name: args.name,
                                createdAt: new Date(),
                                status: 'pending',
                                resource,
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
                        const form = new Form({
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
                    const structure = JSON.parse(args.structure);
                    resource = await Resource.findById(form.resource);
                    const fields = [];
                    for (const page of structure.pages) {
                        await extractFields(page, fields);
                        findDuplicates(fields);
                    }
                    const oldFields = resource.fields;
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
                        const oldField = oldFields.find((x) => x.name === field.name);
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
                const version = new FormVersion({
                    createdAt: form.modifiedAt ? form.modifiedAt : form.createdAt,
                    structure: form.structure,
                    form: form.id,
                });
                // TODO = put interface
                const update: any = {
                    modifiedAt: new Date(),
                    $push: { versions: version },
                };
                if (args.structure) {
                    update.structure = args.structure;
                    const structure = JSON.parse(args.structure);
                    const fields = [];
                    for (const page of structure.pages) {
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
                form = await Form.findByIdAndUpdate(
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
                const record = new Record({
                    form: args.form,
                    createdAt: new Date(),
                    modifiedAt: new Date(),
                    data: args.data,
                    resource: form.resource ? form.resource : null,
                });
                await record.save();
                pubsub.publish('record_added', {
                    recordAdded: record
                });
                return record;
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
                const oldRecord = await Record.findById(args.id);
                const record = Record.findByIdAndUpdate(
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
                if (checkPermission(user, permissions.canManageApplications)) {
                    if (args.name !== '') {
                        const dashboard = new Dashboard({
                            name: args.name,
                            createdAt: new Date(),
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
            },
            async resolve(parent, args, context) {
                if (!args || (!args.name && !args.structure)) {
                    throw new GraphQLError(errors.invalidEditDashboardArguments);
                } else {
                    const user = context.user;
                    let update: { modifiedAt?: Date, structure?: any, name?: string} = {
                        modifiedAt: new Date()
                    };
                    Object.assign(update,
                        args.structure && { structure: args.structure },
                        args.name && { name: args.name },
                    );
                    if (checkPermission(user, permissions.canManageApplications)) {
                        const dashboard = await Dashboard.findByIdAndUpdate(
                            args.id,
                            update,
                            { new: true }
                        );
                        update = {
                            modifiedAt: dashboard.modifiedAt,
                            name: dashboard.name,
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
                            content: args.id
                        };
                        update = {
                            modifiedAt: new Date()
                        };
                        Object.assign(update,
                            args.name && { name: args.name },
                        );
                        const page = await Page.findOneAndUpdate(filters, update);
                        const step = await Step.findOneAndUpdate(filters, update);
                        if (page || step) {
                            Object.assign(update,
                                args.structure && { structure: args.structure },
                            );
                            return Dashboard.findByIdAndUpdate(
                                args.id,
                                update,
                                { new: true }
                            );
                        }
                        throw new GraphQLError(errors.permissionNotGranted);
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
            async resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canManageApplications)) {
                    return Dashboard.findByIdAndDelete(args.id);
                } else {
                    const filters = {
                        'permissions.canSee': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                        content: args.id
                    };
                    const page = await Page.find(filters);
                    const step = await Step.find(filters);
                    if (page || step) {
                        return Dashboard.findByIdAndDelete(args.id);
                    }
                    throw new GraphQLError(errors.permissionNotGranted);
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
                    const role = new Role({
                        title: args.title
                    });
                    if (args.application) {
                        const application = await Application.findById(args.application);
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
                        if (roles.length > 1) throw new GraphQLError(errors.tooManyRoles);
                        const userRoles = await User.findById(args.id).populate({
                            path: 'roles',
                            match: { application: { $ne: args.application } } // Only returns roles not attached to the application
                        });
                        roles = userRoles.roles.map(x => x._id).concat(roles);
                        return User.findByIdAndUpdate(
                            args.id,
                            {
                                roles,
                            },
                            { new: true }
                        ).populate({
                            path: 'roles',
                            match: { application: args.application } // Only returns roles attached to the application
                        });
                    } else {
                        const appRoles = await User.findById(args.id).populate({
                            path: 'roles',
                            match: { application: { $ne: null } } // Returns roles attached to any application
                        });
                        roles = appRoles.roles.map(x => x._id).concat(roles);
                        return User.findByIdAndUpdate(
                            args.id,
                            {
                                roles,
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
            async resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canManageApplications)) {
                    if (args.name !== '') {
                        const application = new Application({
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
                        await application.save();
                        pubsub.publish('notification', {
                            notification: {
                                action: 'Application created',
                                content: application,
                                createdAt: new Date()
                            }
                        });
                        for (const name of ['Editor', 'Manager', 'Guest']) {
                            const role = new Role({
                                title: name,
                                application: application.id
                            });
                            await role.save();
                        }
                        return application;
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
                    const update = {};
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
                    application = await Application.findByIdAndDelete(args.id);
                } else {
                    const filters = {
                        'permissions.canDelete': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                        _id: args.id
                    };
                    application = await Application.findOneAndDelete(filters);
                }
                if (!application) throw new GraphQLError(errors.permissionNotGranted);
                // Delete pages and content recursively
                if (application.pages.length) {
                    for (const pageID of application.pages) {
                        const page = await Page.findByIdAndDelete(pageID);
                        await deleteContent(page);
                    }
                }
                // Delete application's roles
                await Role.deleteMany({application: args.id});
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
                        const application = await Application.findById(args.application);
                        if (!application) throw new GraphQLError(errors.dataNotFound);
                        // Create the linked Workflow or Dashboard
                        let content = args.content;
                        switch (args.type) {
                            case contentType.workflow: {
                                const workflow = new Workflow({
                                    name: args.name,
                                    createdAt: new Date(),
                                });
                                await workflow.save();
                                content = workflow._id;
                                break;
                            }
                            case contentType.dashboard: {
                                const dashboard = new Dashboard({
                                    name: args.name,
                                    createdAt: new Date(),
                                });
                                await dashboard.save();
                                content = dashboard._id;
                                break;
                            }
                            case contentType.form: {
                                const form = await Form.findById(content);
                                if (!form) {
                                    throw new GraphQLError(errors.dataNotFound);
                                }
                                break;
                            }
                            default:
                                break;
                        }
                        // Create a new page.
                        const page = new Page({
                            name: args.name,
                            createdAt: new Date(),
                            type: args.type,
                            content,
                            permissions: {
                                canSee: [],
                                canCreate: [],
                                canUpdate: [],
                                canDelete: []
                            }
                        });
                        await page.save();
                        // Link the new page to the corresponding application by updating this application.
                        const update = {
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
                const update: { modifiedAt?: Date, name?: string, permissions?: any } = {
                    modifiedAt: new Date()
                };
                Object.assign(update,
                    args.name && { name: args.name },
                    args.permissions && { permissions: args.permissions }
                );
                let page = null;
                if (checkPermission(user, permissions.canManageApplications)) {
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
                if (!page) throw new GraphQLError(errors.dataNotFound);
                if (update.permissions) delete update.permissions;
                switch (page.type) {
                    case contentType.workflow:
                        await Workflow.findByIdAndUpdate(page.content, update);
                        break;
                    case contentType.dashboard:
                        await Dashboard.findByIdAndUpdate(page.content, update);
                        break;
                    case contentType.form:
                        if (update.name) delete update.name;
                        await Form.findByIdAndUpdate(page.content, update);
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
                const application = await Application.findOne({ pages: args.id });
                if (!application) throw new GraphQLError(errors.dataNotFound);
                const update = {
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
                        const page = await Page.findById(args.page);
                        if (!page) throw new GraphQLError(errors.dataNotFound);
                        if (page.type !== contentType.workflow) throw new GraphQLError(errors.pageTypeError);
                        // Create a workflow.
                        const workflow = new Workflow({
                            name: args.name,
                            createdAt: new Date(),
                        });
                        await workflow.save();
                        // Link the new workflow to the corresponding page by updating this page.
                        const update = {
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
            },
            async resolve(parent, args, context) {
                if (!args || (!args.name && !args.steps)) {
                    throw new GraphQLError(errors.invalidEditWorkflowArguments);
                } else {
                    const user = context.user;
                    let update = {
                        modifiedAt: new Date()
                    };
                    Object.assign(update,
                        args.name && { name: args.name },
                        args.steps && { steps: args.steps },
                    );
                    if (checkPermission(user, permissions.canManageApplications)) {
                        return Workflow.findByIdAndUpdate(
                            args.id,
                            update,
                            { new: true }
                        );
                    } else {
                        const filters = {
                            'permissions.canUpdate': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                            content: args.id
                        };
                        update = {
                            modifiedAt: new Date()
                        };
                        Object.assign(update,
                            args.name && { name: args.name },
                        );
                        const page = await Page.findOneAndUpdate(filters, update);
                        const step = await Step.findOneAndUpdate(filters, update);
                        if (page || step) {
                            Object.assign(update,
                                args.steps && { steps: args.steps },
                            );
                            return Workflow.findByIdAndUpdate(
                                args.id,
                                update,
                                { new: true }
                            );
                        }
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
                        'permissions.canSee': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                        content: args.id
                    };
                    const page = await Page.find(filters);
                    const step = await Step.find(filters);
                    if (page || step) {
                        workflow = await Workflow.findByIdAndDelete(args.id);
                    }
                    throw new GraphQLError(errors.permissionNotGranted);
                }
                if (!workflow) throw new GraphQLError(errors.permissionNotGranted);
                for (const step of workflow.steps) {
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
                        const workflow = await Workflow.findById(args.workflow);
                        if (!workflow) throw new GraphQLError(errors.dataNotFound);
                        // Create a linked Dashboard if necessary
                        if (args.type === contentType.dashboard) {
                            const dashboard = new Dashboard({
                                name: args.name,
                                createdAt: new Date(),
                            });
                            await dashboard.save();
                            args.content = dashboard._id;
                        }
                        // Create a new step.
                        const step = new Step({
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
                        const update = {
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
                const update = {
                    modifiedAt: new Date()
                };
                Object.assign(update,
                    args.name && { name: args.name },
                    args.type && { type: args.type },
                    args.content && { content: args.content },
                    args.permissions && { permissions: args.permissions }
                );
                let step = null;
                if (checkPermission(user, permissions.canManageApplications)) {
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
                if (!step) throw new GraphQLError(errors.dataNotFound);
                if (step.type === contentType.dashboard) {
                    // tslint:disable-next-line: no-shadowed-variable
                    const update = {
                        modifiedAt: new Date(),
                    };
                    Object.assign(update,
                        args.name && { name: args.name },
                    );
                    await Dashboard.findByIdAndUpdate(step.content, update);
                }
                return step;
            }
        },
        deleteStep: {
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
                const workflow = await Workflow.findOne({ steps: args.id });
                if (!workflow) throw new GraphQLError(errors.dataNotFound);
                let step;
                if (checkPermission(user, permissions.canManageApplications)) {
                    step = await Step.findByIdAndDelete(args.id);
                } else {
                    // Check if we can update workflow and delete step
                    // if (workflow.permissions.canUpdate.some(x => context.user.roles.map(x => mongoose.Types.ObjectId(x._id)).includes(x))) {
                    // }
                    const filters = {
                        'permissions.canDelete': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                        _id: args.id
                    };
                    step = await Step.findOneAndDelete(filters);
                }
                if (!step) throw new GraphQLError(errors.permissionNotGranted);
                await deleteContent(step);
                const update = {
                    modifiedAt: new Date(),
                    $pull: { steps: args.id }
                };
                await Workflow.findByIdAndUpdate(
                    workflow.id,
                    update,
                    { new: true }
                );
                return step;
            }
        },
    }
});

export default Mutation;