import { GraphQLNonNull, GraphQLID, GraphQLString, GraphQLError } from "graphql";
import GraphQLJSON from "graphql-type-json";
import { Form, Resource, Version } from "../../models";
import extractFields from "../../utils/extractFields";
import findDuplicates from "../../utils/findDuplicates";
import { FormType } from "../types";

export default {
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
        const version = new Version({
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
}