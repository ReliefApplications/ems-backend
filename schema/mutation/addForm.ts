import { GraphQLNonNull, GraphQLString, GraphQLBoolean, GraphQLID, GraphQLError } from "graphql";
import errors from "../../const/errors";
import protectedNames from "../../const/protectedNames";
import { Resource, Form } from "../../models";
import buildTypes from "../../utils/buildTypes";
import { FormType } from "../types";

export default {
    type: FormType,
    args: {
        name: { type: new GraphQLNonNull(GraphQLString) },
        newResource: { type: GraphQLBoolean },
        resource: { type: GraphQLID },
        template: { type: GraphQLID }
    },
    async resolve(parent, args) {
        if (args.newResource && args.resource) {
            throw new GraphQLError(errors.invalidAddFormArguments);
        }
        if (protectedNames.indexOf(args.name.toLowerCase()) >= 0) {
            throw new GraphQLError(errors.usageOfProtectedName);
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
                    await form.save();
                    buildTypes();
                    return form;
                } else {
                    const resource = await Resource.findById(args.resource);
                    const coreForm = await Form.findOne({ resource: args.resource, core: true });
                    let structure = coreForm.structure;
                    if (args.template) {
                        const templateForm = await Form.findOne({ resource: args.resource, _id: args.template });
                        if (templateForm) structure = templateForm.structure;
                    }
                    const form = new Form({
                        name: args.name,
                        createdAt: new Date(),
                        status: 'pending',
                        resource,
                        structure,
                        permissions: {
                            canSee: [],
                            canCreate: [],
                            canUpdate: [],
                            canDelete: []
                        }
                    });
                    await form.save();
                    buildTypes();
                    return form;
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
                await form.save();
                buildTypes();
                return form;
            }
        } catch (error) {
            console.log(error);
            throw new GraphQLError(errors.resourceDuplicated);
        }
    },
}