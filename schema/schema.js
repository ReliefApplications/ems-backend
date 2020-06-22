const graphql = require('graphql');
const Form = require('../models/form');
const FormVersion = require('../models/form-version');
const Resource = require('../models/resource');
const Permission = require('../models/permission');
const Record = require('../models/record');

const {
    GraphQLObjectType, GraphQLString,
    GraphQLID, GraphQLFloat, GraphQLSchema, GraphQLBoolean, GraphQLInt,
    GraphQLList, GraphQLNonNull, GraphQLInterfaceType, GraphQLUnionType
} = graphql;
const { GraphQLJSON, GraphQLJSONObject } = require('graphql-type-json');

// === TYPES ===

const PermissionType = new GraphQLObjectType({
    name: 'Permission',
    fields: () => ({
        type: { type: GraphQLString },
    })
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
                return Permission.find().where('_id').in(parent.permissions)
            }
        },
        forms: {
            type: new GraphQLList(FormType),
            resolve(parent, args) {
                return Form.find({ resource: parent.id});
            }
        },
        records: {
            type: new GraphQLList(RecordType),
            async resolve(parent, args) {
                let forms = await Form.find({ resource: parent.id });
                return Record.find().where('form').in(forms);
            }
        },
        recordsCount: {
            type: GraphQLInt,
            async resolve(parent, args) {
                let forms = await Form.find({ resource: parent.id });
                return Record.find().where('form').in(forms).count();
            }
        },
        fields: { type: GraphQLJSON }
    })
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
            }
        },
        resource: {
            type: ResourceType,
            resolve(parent, args) {
                return Resource.findById(parent.resource);
            }
        },
        records: {
            type: new GraphQLList(RecordType),
            resolve(parent, args) {
                return Record.find({ form: parent.id });
            }
        },
        recordsCount: {
            type: GraphQLInt,
            resolve(parent, args) {
                return Record.find({ form: parent.id }).count();
            }
        },
        versions: {
            type: new GraphQLList(FormVersionType),
            resolve(parent, args) {
                return FormVersion.find().where('_id').in(parent.versions);
            }
        }
    })
});

const FormVersionType = new GraphQLObjectType({
    name: 'FormVersion',
    fields: () => ({
        id: { type: GraphQLID },
        createdAt: { type: GraphQLString },
        structure: { type: GraphQLJSON }
    })
})

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
            }
        },
        data: {
            type: GraphQLJSON,
            async resolve(parent, args) {
                let resource = await Resource.findById(parent.resource);
                let res = {};
                if (resource) {
                    for (let field of resource.fields) {
                        let name = field.name;
                        if (parent.data[name]) {
                            if (field.data && field.data.resource) {
                                try {
                                    let record = await Record.findById(parent.data[name]);
                                    res[name] = record.data;
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
            }
        }
    })
})

// === QUERIES ===

const Query = new GraphQLObjectType({
    name: 'Query',
    fields: {
        resources: {
            type: new GraphQLList(ResourceType),
            resolve(parent, args) {
                return Resource.find({});
            }
        },
        resource: {
            type: ResourceType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) }
            },
            resolve(parent, args) {
                return Resource.findById(args.id)
            }
        },
        forms: {
            type: new GraphQLList(FormType),
            resolve(parent, args) {
                return Form.find({});
            }
        },
        form: {
            type: FormType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) }
            },
            resolve(parent, args) {
                return Form.findById(args.id)
            }
        },
        records: {
            type: new GraphQLList(RecordType),
            resolve(parent, args) {
                return Record.find({});
            }
        },
        record: {
            type: RecordType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) }
            },
            resolve(parent, args) {
                return Record.findById(args.id)
            }
        }
    }
});

// === MUTATIONS ===

const Mutation = new GraphQLObjectType({
    name: 'Mutation',
    fields: {
        addResource: {
            type: ResourceType,
            args: {
                name: { type: new GraphQLNonNull(GraphQLString) },
                fields: { type: new GraphQLNonNull(new GraphQLList(GraphQLJSON)) }
            },
            resolve(parent, args) {
                let resource = new Resource({
                    name: args.name,
                    createdAt: new Date(),
                    fields: args.fields
                });
                return resource.save();
            }
        },
        editResource: {
            type: ResourceType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) },
                fields: { type: new GraphQLNonNull(new GraphQLList(GraphQLJSON)) }
            },
            resolve(parent, args) {
                let resource = Resource.findByIdAndUpdate(
                    args.id,
                    {
                        fields: args.fields
                    },
                    { new: true }
                );
                return resource;
            }
        },
        deleteResource: {
            type: ResourceType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) }
            },
            resolve(parent, args) {
                let resource = Resource.findByIdAndRemove(args.id);
                return resource;
            }
        },
        addForm: {
            type: FormType,
            args: {
                name: { type: new GraphQLNonNull(GraphQLString) },
                // resource: { type: new GraphQLNonNull(GraphQLID) },
                structure: { type: new GraphQLNonNull(GraphQLJSON) },
                newResource: { type: GraphQLBoolean }
            },
            async resolve(parent, args) {
                let structure = JSON.parse(args.structure);
                if (args.newResource) {
                    let fields = [];
                    for (let page of structure.pages) {
                        if (page.elements) {
                            for (let element of page.elements) {
                                fields.push(
                                    {
                                        type: element.type,
                                        name: element.valueName ? element.valueName : element.name,
                                        isRequired: element.isRequired ? element.isRequired : false
                                    }
                                );
                            }
                        }
                    }
                    let resource = new Resource({
                        name: args.name,
                        createdAt: new Date(),
                        fields: fields
                    });
                    await resource.save();
                    let form = new Form({
                        name: args.name,
                        createdAt: new Date(),
                        status: 'pending',
                        resource: resource.id,
                        structure: args.structure
                    });
                    return form.save();
                } else {
                    let form = new Form({
                        name: args.name,
                        createdAt: new Date(),
                        status: 'pending',
                        // resource: args.resource
                        structure: args.structure
                    });
                    return form.save();
                }
            }
        },
        editForm: {
            type: FormType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) },
                structure: { type: GraphQLJSON },
                status: { type: GraphQLString }
            },
            async resolve(parent, args) {
                let form = await Form.findById(args.id);
                let version = new FormVersion({
                    createdAt: form.modifiedAt ? form.modifiedAt : form.createdAt,
                    structure: form.structure,
                    form: form.id
                });
                let update = {
                    modifiedAt: new Date(),
                    $push: { versions: version }
                };
                if (args.structure) {
                    update.structure = args.structure;
                }
                if (args.status) {
                    update.status = args.status;
                }
                form = Form.findByIdAndUpdate(
                    args.id,
                    update,
                    { new: true },
                    (err, res) => {
                        version.save();
                    }
                );
                return form;
            }
        },
        /** This one really deletes the form, and all records associated with it.
         * If you only want to archive, you should use the update mutation.
         * */ 
        deleteForm: {
            type: FormType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) }
            },
            resolve(parent, args) {
                let form = Form.findByIdAndRemove(args.id, (err, res) => {
                    Record.remove({form: args.id}).exec();
                });
                return form;
            }
        },
        addRecord: {
            type: RecordType,
            args: {
                form: { type: new GraphQLNonNull(GraphQLID) },
                data: { type: new GraphQLNonNull(GraphQLJSON) }
            },
            resolve(parent, args) {
                let record = new Record({
                    form: args.form,
                    createdAt: new Date(),
                    modifiedAt: new Date(),
                    data: args.data
                });
                return record.save();
            }
        },
        editRecord: {
            type: RecordType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) },
                data: { type: new GraphQLNonNull(GraphQLJSON) }
            },
            resolve(parent, args) {
                let record = Record.findByIdAndUpdate(args.id, {
                    data: args.data,
                    modifiedAt: new Date()
                },
                    { new: true });
                return record;
            }
        },
        deleteRecord: {
            type: RecordType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) },
            },
            resolve(parent, args) {
                let record = Record.findByIdAndRemove(args.id);
                return record;
            }
        }
    }
});

module.exports = new GraphQLSchema({
    query: Query,
    mutation: Mutation
});