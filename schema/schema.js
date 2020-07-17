/* eslint-disable no-unused-vars */
const graphql = require('graphql');
const Form = require('../models/form');
const FormVersion = require('../models/form-version');
const Resource = require('../models/resource');
const Permission = require('../models/permission');
const Record = require('../models/record');
const Dashboard = require('../models/dashboard');
const extractFields = require('../utils/extractFields');
const findDuplicates = require('../utils/findDuplicates');

const {
    GraphQLObjectType,
    GraphQLString,
    GraphQLID,
    GraphQLSchema,
    GraphQLBoolean,
    GraphQLInt,
    GraphQLList,
    GraphQLNonNull,
} = graphql;
const { GraphQLJSON } = require('graphql-type-json');
const { GraphQLError } = require('graphql/error');

// === TYPES ===

const PermissionType = new GraphQLObjectType({
    name: 'Permission',
    fields: () => ({
        type: { type: GraphQLString },
    }),
});

const ResourceType = new GraphQLObjectType({
    name: 'Resource',
    fields: () => ({
        id: { type: GraphQLID },
        name: { type: GraphQLString },
        createdAt: { type: GraphQLString },
        permissions: {
            type: new GraphQLList(PermissionType),
            resolve(parent, args) {
                return Permission.find().where('_id').in(parent.permissions);
            },
        },
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
        permissions: {
            type: new GraphQLList(PermissionType),
            resolve(parent, args) {
                return Permission.find().where('_id').in(parent.permissions);
            },
        },
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
                                        // res[name] = {
                                        //     id: parent.data[name],
                                        //     value: record.data[field.displayField]
                                        // }; // TODO: nesting of elements
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
            type: new GraphQLList(PermissionType),
            resolve(parent, args) {
                return Permission.find().where('_id').in(parent.permissions);
            },
        },
    }),
});

// === QUERIES ===

const Query = new GraphQLObjectType({
    name: 'Query',
    fields: {
        resources: {
            type: new GraphQLList(ResourceType),
            resolve(parent, args) {
                return Resource.find({});
            },
        },
        resource: {
            type: ResourceType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) },
            },
            resolve(parent, args) {
                return Resource.findById(args.id);
            },
        },
        forms: {
            type: new GraphQLList(FormType),
            resolve(parent, args) {
                return Form.find({});
            },
        },
        form: {
            type: FormType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) },
            },
            resolve(parent, args) {
                return Form.findById(args.id);
            },
        },
        records: {
            type: new GraphQLList(RecordType),
            resolve(parent, args) {
                return Record.find({});
            },
        },
        record: {
            type: RecordType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) },
            },
            resolve(parent, args) {
                return Record.findById(args.id);
            },
        },
        dashboards: {
            type: new GraphQLList(DashboardType),
            resolve(parent, args) {
                return Dashboard.find({});
            },
        },
        dashboard: {
            type: DashboardType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) },
            },
            resolve(parent, args) {
                return Dashboard.findById(args.id);
            },
        },
    },
});

// === MUTATIONS ===

const Mutation = new GraphQLObjectType({
    name: 'Mutation',
    fields: {
        addResource: {
            type: ResourceType,
            args: {
                name: { type: new GraphQLNonNull(GraphQLString) },
                fields: { type: new GraphQLNonNull(new GraphQLList(GraphQLJSON)) },
            },
            resolve(parent, args) {
                let resource = new Resource({
                    name: args.name,
                    createdAt: new Date(),
                    fields: args.fields,
                });
                return resource.save();
            },
        },
        editResource: {
            type: ResourceType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) },
                fields: { type: new GraphQLNonNull(new GraphQLList(GraphQLJSON)) },
            },
            resolve(parent, args) {
                let resource = Resource.findByIdAndUpdate(
                    args.id,
                    {
                        fields: args.fields,
                    },
                    { new: true }
                );
                return resource;
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
                    throw new GraphQLError(
                        'Form should either correspond to a new resource or existing resource.'
                    );
                }
                try {
                    if (args.resource || args.newResource) {
                        if (args.newResource) {
                            let resource = new Resource({
                                name: args.name,
                                createdAt: new Date(),
                            });
                            await resource.save();
                            let form = new Form({
                                name: args.name,
                                createdAt: new Date(),
                                status: 'pending',
                                resource: resource,
                                core: true,
                            });
                            return form.save();
                        } else {
                            let resource = await Resource.findById(args.resource);
                            let form = new Form({
                                name: args.name,
                                createdAt: new Date(),
                                status: 'pending',
                                resource: resource
                            });
                            return form.save();
                        }
                    }
                    else {
                        let form = new Form({
                            name: args.name,
                            createdAt: new Date(),
                            status: 'pending'
                        });
                        return form.save();
                    }
                } catch (error) {
                    throw new GraphQLError(
                        'Cannot create the form, an existing resource with that name already exists.'
                    );
                }
            },
        },

        editForm: {
            type: FormType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) },
                structure: { type: GraphQLJSON },
                status: { type: GraphQLString },
                name: { type: GraphQLString }
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
                    console.log(fields);
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
            resolve(parent, args) {
                let record = Record.findByIdAndUpdate(
                    args.id,
                    {
                        data: args.data,
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
                    });
                    return dashboard.save();
                }

                throw new GraphQLError('Name must be provided');
            },
        },
        editDashboard: {
            type: DashboardType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) },
                structure: { type: GraphQLJSON },
                name: { type: GraphQLString },
            },
            resolve(parent, args) {
                if (!args || (!args.name && !args.structure)) {
                    throw new GraphQLError('Either name or structure must be provided');
                } else {
                    let update = {
                        modifiedAt: new Date()
                    };
                    Object.assign(update,
                        args.structure && { structure: args.structure },
                        args.name && { name: args.name }
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
    },
});

module.exports = new GraphQLSchema({
    query: Query,
    mutation: Mutation,
});
