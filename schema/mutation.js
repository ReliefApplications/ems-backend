/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
const graphql = require('graphql');
const Form = require('../models/form');
const FormVersion = require('../models/form-version');
const Resource = require('../models/resource');
const Record = require('../models/record');
const Dashboard = require('../models/dashboard');
const User = require('../models/user');
const Role = require('../models/role');
const extractFields = require('../utils/extractFields');
const findDuplicates = require('../utils/findDuplicates');
const checkPermission = require('../utils/checkPermission');
const permissions = require('../const/permissions');
const errors = require('../const/errors');

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
    UserType
} = require('./types');

// === MUTATIONS ===
const Mutation = new GraphQLObjectType({
    name: 'Mutation',
    fields: {
        addResource: {
            /*  Creates a new resource.
                Throw GraphQL error if not authorized.
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
                Throw GraphQL error if not authorized.
            */
            type: ResourceType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) },
                fields: { type: new GraphQLList(GraphQLJSON) },
                permissions: { type: GraphQLJSON }
            },
            resolve(parent, args, context) {
                const user = context.user;
                if (!args || (!args.fields && !args.permissions)) {
                    throw new GraphQLError(errors.invalidEditResourceArguments);
                } else {
                    let update = {};
                    Object.assign(update,
                        args.fields && { fields: args.fields },
                        args.permissions && { permissions: args.permissions }    
                    );
                    let resource = Resource.findByIdAndUpdate(
                        args.id,
                        update,
                        { new: true }
                    );
                    return resource;
                }
            },
        },
        deleteResource: {
            type: ResourceType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) },
            },
            resolve(parent, args) {
                let resource = Resource.findByIdAndRemove(args.id);
                return resource;
            },
        },
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
        editForm: {
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
        /** This one really deletes the form, and all records associated with it.
     * If you only want to archive, you should use the update mutation.
     * */
        deleteForm: {
            type: FormType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) },
            },
            resolve(parent, args) {
                let form = Form.findByIdAndRemove(args.id, () => {
                    Record.remove({ form: args.id }).exec();
                });
                return form;
            },
        },
        addRecord: {
            type: RecordType,
            args: {
                form: { type: GraphQLID },
                data: { type: new GraphQLNonNull(GraphQLJSON) },
            },
            async resolve(parent, args) {
                let form = await Form.findById(args.form);
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
                        data: {...oldRecord.data, ...args.data},
                        modifiedAt: new Date(),
                    },
                    { new: true }
                );
                return record;
            },
        },
        deleteRecord: {
            type: RecordType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) },
            },
            resolve(parent, args) {
                let record = Record.findByIdAndRemove(args.id);
                return record;
            },
        },
        addDashboard: {
            type: DashboardType,
            args: {
                name: { type: new GraphQLNonNull(GraphQLString) },
            },
            resolve(parent, args) {
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
            },
        },
        editDashboard: {
            type: DashboardType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) },
                structure: { type: GraphQLJSON },
                name: { type: GraphQLString },
                permissions: { type: GraphQLJSON }
            },
            resolve(parent, args) {
                if (!args || (!args.name && !args.structure && !args.permissions)) {
                    throw new GraphQLError(errors.invalidEditDashboardArguments);
                } else {
                    let update = {
                        modifiedAt: new Date()
                    };
                    Object.assign(update,
                        args.structure && { structure: args.structure },
                        args.name && { name: args.name },
                        args.permissions && { permissions: args.permissions }
                    );
                    let dashboard = Dashboard.findByIdAndUpdate(
                        args.id,
                        update,
                        { new: true }
                    );
                    return dashboard;
                }
            },
        },
        deleteDashboard: {
            type: DashboardType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) },
            },
            resolve(parent, args) {
                let dashboard = Dashboard.findByIdAndDelete(args.id);
                return dashboard;
            },
        },
        addRole: {
            /*  Creates a new role.
                Throw an error if not logged or authorized.
            */
            type: RoleType,
            args: {
                title: { type: new GraphQLNonNull(GraphQLString) }
            },
            async resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canSeeRoles)) {
                    let role = new Role({
                        title: args.title
                    });
                    return role.save();
                } else {
                    throw new GraphQLError(errors.permissionNotGranted);
                }
            },
        },
        editRole: {
            /*  Edits a role's admin permissions, providing its id and the list of admin permissions.
                Throw an error if not logged or authorized.
            */
            type: RoleType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID)},
                permissions: { type: new GraphQLList(GraphQLID)}
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
        editUser: {
            /*  Edits an user's roles, providing its id and the list of roles.
                Throw an error if not logged or authorized.
            */
            type: UserType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) },
                roles: { type: new GraphQLList(GraphQLID) },
            },
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canSeeUsers)) {
                    return User.findByIdAndUpdate(
                        args.id,
                        {
                            roles: args.roles,
                        },
                        { new: true }
                    );
                } else {
                    throw new GraphQLError(errors.permissionNotGranted);
                }
            },
        },
    },
});

module.exports = Mutation;