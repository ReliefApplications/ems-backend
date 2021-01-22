import { GraphQLObjectType, GraphQLID, GraphQLString, GraphQLBoolean, GraphQLList } from "graphql";
import GraphQLJSON from "graphql-type-json";
import { FormType, VersionType } from ".";
import { Form, Resource, Record, Version } from "../../models";

export const RecordType = new GraphQLObjectType({
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
                    const source = parent.resource ? await Resource.findById(parent.resource) : await Form.findById(parent.form);
                    const res = {};
                    if (source) {
                        for (const field of source.fields) {
                            const name = field.name;
                            if (parent.data[name]) {
                                res[name] = parent.data[name];
                                if (field.resource && field.displayField) {
                                    try {
                                        const record = await Record.findById(parent.data[name]);
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
        versions: {
            type: new GraphQLList(VersionType),
            resolve(parent, args) {
                return Version.find().where('_id').in(parent.versions);
            },
        },
    }),
});