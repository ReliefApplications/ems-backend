import { GraphQLNonNull, GraphQLID, GraphQLString, GraphQLError } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { Form, Resource, Version, Channel, Notification } from '../../models';
import buildTypes from '../../utils/buildTypes';
import extractFields from '../../utils/extractFields';
import findDuplicates from '../../utils/findDuplicates';
import deleteContent from '../../services/deleteContent';
import { FormType } from '../types';
import validateName from '../../utils/validateName';
import mongoose from 'mongoose';
import errors from '../../const/errors';
import { AppAbility } from '../../security/defineAbilityFor';

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
        if (form.resource && args.structure) {
            // Resource inheritance management
            const structure = JSON.parse(args.structure);
            const resource = await Resource.findById(form.resource);
            const fields = [];
            for (const page of structure.pages) {
                await extractFields(page, fields, form.core);
                findDuplicates(fields);
            }
            const oldFields = resource.fields;
            // Add new fields to the resource
            for (const field of fields) {
                const oldField = oldFields.find((x) => x.name === field.name);
                if (!oldField) {
                    const newField: any = Object.assign({}, field);
                    newField.isRequired = form.core && field.isRequired ? true : false;
                    oldFields.push(newField);
                } else {
                    if (form.core) {
                        for (const key of Object.keys(field)) {
                            if (!oldField[key] || oldField[key] !== field[key]) {
                                oldField[key] = field[key];
                            }
                        }
                    }
                }
            }
            // Check if there are unused fields in the resource
            const forms = await Form.find({ resource: form.resource, _id: { $ne: mongoose.Types.ObjectId(args.id) } });
            const usedFields = forms.map(x => x.fields).flat().concat(fields);
            for (let index = 0; index < oldFields.length; index++) {
                const field = oldFields[index];
                if ((form.core ? !fields.some(x => x.name === field.name) : true) && !usedFields.some(x => x.name === field.name)) {
                    oldFields.splice(index, 1);
                    index --;
                }
            }
            if (!form.core) {
                // Check if a required field is missing
                for (const field of oldFields.filter(x => x.isCore)) {
                    if (!fields.find(x => x.name === field.name)) {
                        //throw new GraphQLError(errors.coreFieldMissing(field.name));
                    }
                }
            } else {
                // For each old field from core form which is not anymore in the current core form fields
                for (const field of form.fields.filter(
                    (x) => !fields.some((y) => x.name === y.name)
                )) {
                    // Check if we rename or delete a field used in a child form -> Do we really want to check that ?
                    if (usedFields.find(x => x.name === field.name)) {
                        // If this deleted / modified field was used, raise an error
                        //throw new GraphQLError(errors.dataFieldCannotBeDeleted(field.name));
                        // We mark it instead as non core field
                        const index = oldFields.findIndex(x => x.name === field.name);
                        oldFields[index].isCore = false;
                    }
                }
            }
            // Update resource fields
            await Resource.findByIdAndUpdate(form.resource, {
                fields: oldFields,
            });
        }
        const version = new Version({
            createdAt: form.modifiedAt ? form.modifiedAt : form.createdAt,
            data: form.structure,
        });
        // TODO = put interface
        const update: any = {
            modifiedAt: new Date(),
            $push: { versions: version._id },
        };
        if (args.structure) {
            update.structure = args.structure;
            const structure = JSON.parse(args.structure);
            const fields = [];
            for (const page of structure.pages) {
                await extractFields(page, fields, form.core);
                findDuplicates(fields);
            }
            update.fields = fields;
        }
        if (args.status) {
            update.status = args.status;
            if (update.status === 'active') {
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
        if (args.name) {
            update.name = args.name;
            if (form.core) {
                await Resource.findByIdAndUpdate(form.resource, {
                    name: args.name
                });
            }
        }
        if (args.permissions) {
            for (const permission in args.permissions) {
                update['permissions.' + permission] = args.permissions[permission];
            }
        }
        await version.save();
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
