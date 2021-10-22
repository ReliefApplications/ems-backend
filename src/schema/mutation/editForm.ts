import { GraphQLNonNull, GraphQLID, GraphQLString, GraphQLError } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { Form, Resource, Version, Channel, Notification } from '../../models';
import { buildTypes } from '../../utils/schema';
import { removeField, addField, replaceField, findDuplicateFields, extractFields } from '../../utils/form';
import deleteContent from '../../services/deleteContent';
import { FormType } from '../types';
import { validateName } from '../../utils/validators';
import mongoose from 'mongoose';
import errors from '../../const/errors';
import { AppAbility } from '../../security/defineAbilityFor';
import { status, StatusEnumType } from '../../const/enumTypes';
import isEqual from 'lodash/isEqual';


export default {
    /*  Finds form from its id and update it, if user is authorized.
        Throws an error if not logged or authorized, or arguments are invalid.
    */
    type: FormType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        structure: { type: GraphQLJSON },
        status: { type: StatusEnumType },
        name: { type: GraphQLString },
        permissions: { type: GraphQLJSON }
    },
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }

        const ability: AppAbility = context.user.ability;
        if (args.name) {
            validateName(args.name);
        }
        const form = await Form.findById(args.id).accessibleBy(ability, 'update');
        if (!form) { throw new GraphQLError(errors.permissionNotGranted); }

        // Initialize the update object --- TODO = put interface
        const update: any = {
            modifiedAt: new Date()
        };
        // Update fields and structure
        if (args.structure) {
            update.structure = args.structure;
            const structure = JSON.parse(args.structure);
            const fields = [];
            for (const page of structure.pages) {
                await extractFields(page, fields, form.core);
                findDuplicateFields(fields);
                for (const field of fields.filter(x => ['resource', 'resources'].includes(x.type))) {
                    // Raises an error if the field is already used as related name for this resource
                    if (await Form.findOne({
                            fields: { $elemMatch: { resource: field.resource, relatedName: field.relatedName } },
                            _id: { $ne: form.id },
                            ...form.resource && { resource: { $ne: form.resource } }
                        })) {
                        throw new GraphQLError(errors.relatedNameDuplicated(field.relatedName));
                    }
                    // Raises an error if the field exists in the resource
                    if (await Resource.findOne({
                        fields: { $elemMatch: { name: field.relatedName } },
                        _id: field.resource })
                    ) {
                        throw new GraphQLError(errors.relatedNameDuplicated(field.relatedName));
                    }
                }
            }
            // Resource inheritance management
            if (form.resource) {
                const resource = await Resource.findById(form.resource);
                const childForms = await Form.find({ resource: form.resource, _id: { $ne: mongoose.Types.ObjectId(args.id) } }).select('_id structure fields');
                const oldFields: any[] = JSON.parse(JSON.stringify(resource.fields));
                const usedFields = childForms.map(x => x.fields).flat().concat(fields);
                // Check fields against the resource to add new ones or edit old ones
                for (const field of fields) {
                    const oldField = oldFields.find((x) => x.name === field.name);
                    if (!oldField) {
                        // If the field is not in the resource add a new one
                        const newField: any = Object.assign({}, field);
                        newField.isRequired = form.core && field.isRequired ? true : false;
                        oldFields.push(newField);
                    } else {
                        // Check if field can be updated
                        if (!oldField.isCore || oldField.isCore && form.core) {
                            // Check if the field has changes
                            if (!isEqual(oldField, field)) {
                                const index = oldFields.findIndex((x) => x.name === field.name);
                                oldFields.splice(index, 1, field);
                                // === REFLECT UPDATE ===
                                for (const childForm of childForms) {
                                    // Update field
                                    childForm.fields = childForm.fields.map(x => x.name === field.name ? field : x);
                                    // Update structure
                                    const newStructure = JSON.parse(childForm.structure);
                                    replaceField(newStructure, field.name, structure);
                                    childForm.structure = JSON.stringify(newStructure)
                                    // Update form
                                    const update = {
                                        structure: childForm.structure,
                                        fields: childForm.fields
                                    };
                                    await Form.findByIdAndUpdate(childForm._id, update, { new: true });
                                }
                            }
                        }
                    }
                }
                // Check if there are unused or duplicated fields in the resource
                for (let index = 0; index < oldFields.length; index++) {
                    const field = oldFields[index];
                    const removeField = (form.core ? !fields.some(x => x.name === field.name) : true) && !usedFields.some(x => x.name === field.name) // Unused
                        || oldFields.some((x, id) => field.name === x.name && id !== index) // Duplicated
                    if (removeField) {
                        oldFields.splice(index, 1);
                        index --;
                    }
                }
                if (!form.core) {
                    // Check if a required field is missing
                    // Keep old version and move that to extract fields ? 
                    let fieldExists = false;
                    for (const field of oldFields.filter(x => x.isCore)) {
                        fields.map(x => {
                            if (x.name === field.name) {
                                x.isCore = true;
                                fieldExists = true;
                            }
                            return x;
                        });
                        if (!fieldExists) {
                            throw new GraphQLError(errors.coreFieldMissing(field.name));
                        }
                        fieldExists = false;
                    }
                } else {
                    // === REFLECT DELETION ===
                    // For each old field from core form which is not anymore in the current core form fields
                    for (const field of form.fields.filter(
                        (x) => !fields.some((y) => x.name === y.name)
                    )) {
                        // Check if we rename or delete a field used in a child form
                        if (usedFields.some(x => x.name === field.name)) {
                            // If this deleted / modified field was used, reflect the deletion / edition
                            for (const childForm of childForms) {
                                // Remove from fields
                                const index = childForm.fields.findIndex(x => x.name === field.name);
                                childForm.fields.splice(index, 1);
                                // Remove from structure
                                const newStructure = JSON.parse(childForm.structure);
                                removeField(newStructure, field.name);
                                childForm.structure = JSON.stringify(newStructure)
                                // Update form
                                const update = {
                                    structure: childForm.structure,
                                    fields: childForm.fields
                                };
                                await Form.findByIdAndUpdate(childForm._id, update, { new: true });
                            }
                            // We remove the field from the resource
                            const index = oldFields.findIndex(x => x.name === field.name);
                            oldFields.splice(index, 1);
                        }
                    }
                    // === REFLECT ADDITION ===
                    // For each new field from core form which were not before in the old core form fields
                    for (const field of fields.filter(
                        (x) => !form.fields.some((y) => x.name === y.name)
                    )) {
                        for (const childForm of childForms) {
                            // Add to fields and structure if needed
                            if (!childForm.fields.some(x => x.name === field.name)) {
                                childForm.fields.unshift(field);
                                const newStructure = JSON.parse(childForm.structure);
                                addField(newStructure, field.name, structure);
                                childForm.structure = JSON.stringify(newStructure);
                                // Update form
                                const update = {
                                    structure: childForm.structure,
                                    fields: childForm.fields
                                };
                                await Form.findByIdAndUpdate(childForm._id, update, { new: true });
                            }
                        }
                    }
                }
                
                // Update resource fields
                await Resource.findByIdAndUpdate(form.resource, {
                    fields: oldFields,
                });
            }
            update.fields = fields;
        }
        // Update version
        const version = new Version({
            createdAt: form.modifiedAt ? form.modifiedAt : form.createdAt,
            data: form.structure,
        });
        await version.save();
        update.$push = { versions: version._id };
        // Update status
        if (args.status) {
            update.status = args.status;
            if (update.status === status.active) {
            // Create notification channel
            const notificationChannel = new Channel({
                title: `Form - ${form.name}`,
                form: form._id
            })
            await notificationChannel.save();
            update.channel = notificationChannel.form
            } else {
                // delete channel and notifications if form not active anymore
                const channel = await Channel.findOneAndDelete({ form: form._id});
                if (channel)  {
                    await deleteContent(channel);
                    await Notification.deleteMany({ channel: channel._id });
                    update.channel = [];
                }
            }
        }
        // Update name
        if (args.name) {
            update.name = args.name;
            if (form.core) {
                await Resource.findByIdAndUpdate(form.resource, {
                    name: args.name
                });
            }
        }
        // Update permissions
        if (args.permissions) {
            for (const permission in args.permissions) {
                update['permissions.' + permission] = args.permissions[permission];
            }
        }
        // Return updated form
        return Form.findByIdAndUpdate(
            args.id,
            update,
            { new: true },
            () => {
                buildTypes()
            }
        );
    },
}
