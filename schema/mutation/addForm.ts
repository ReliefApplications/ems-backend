import { GraphQLNonNull, GraphQLString, GraphQLBoolean, GraphQLID, GraphQLError } from "graphql";
import errors from "../../const/errors";
import { FormType } from "../types";
import Form from '../../models/form';
import Resource from '../../models/resource';

export default {
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
}