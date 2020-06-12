const graphql = require('graphql');
const Form = require('../models/form');
const Resource = require('../models/resource');
const Permission = require('../models/permission');
const Record = require('../models/record');

const {
    GraphQLObjectType, GraphQLString,
    GraphQLID, GraphQLFloat, GraphQLSchema, GraphQLBoolean,
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
        records: {
            type: new GraphQLList(RecordType),
            resolve(parent, args) {
                return Record.find({ resource: parent.id });
            }
        },
        fields: { type: GraphQLJSON }
    })
})

const FormType = new GraphQLObjectType({
    name: 'Form',
    fields: () => ({
        id: { type: GraphQLID },
        createdAt: { type: GraphQLString },
        name: { type: GraphQLString },
        permissions: {
            type: new GraphQLList(PermissionType),
            resolve(parent, args) {
                return Permission.find().where('_id').in(parent.permissions)
            }
        },
        resource: {
            type: ResourceType,
            resolve(parent, args) {
                return Resource.findById(parent.resource)
            }
        }
    })
});

const RecordType = new GraphQLObjectType({
    name: 'Record',
    fields: () => ({
        id: { type: GraphQLID },
        createdAt: { type: GraphQLString },
        modifiedAt: { type: GraphQLString },
        deleted: { type: GraphQLBoolean },
        resource: {
            type: ResourceType,
            resolve(parent, args) {
                return Resource.findById(parent.resource);
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
                resource: { type: new GraphQLNonNull(GraphQLID) }
            },
            resolve(parent, args) {
                let form = new Form({
                    name: args.name,
                    createdAt: new Date(),
                    resource: args.resource
                });
                return form.save();
            }
        },
        addRecord: {
            type: RecordType,
            args: {
                resource: { type: new GraphQLNonNull(GraphQLID) },
                data: { type: new GraphQLNonNull(GraphQLJSON) }
            },
            resolve(parent, args) {
                let record = new Record({
                    resource: args.resource,
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