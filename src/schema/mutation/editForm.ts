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
import differenceWith from 'lodash/differenceWith';
import unionWith from 'lodash/unionWith';

// List of keys of the structure's object which we want to inherit to the children forms when they are modified on the core form
// If a trigger is removed from the core form, we will remove it from the children forms, same for the calculatedValues.
// Other keys can be added here
const INHERITED_PROPERTIES = ['triggers', 'calculatedValues'];

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
    permissions: { type: GraphQLJSON },
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
      modifiedAt: new Date(),
    };
    // Update fields and structure
    if (args.structure && !isEqual(form.structure, args.structure)) {
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
            ...form.resource && { resource: { $ne: form.resource } },
          })) {
            throw new GraphQLError(errors.relatedNameDuplicated(field.relatedName));
          }
          // Raises an error if the field exists in the resource
          if (await Resource.findOne({
            fields: { $elemMatch: { name: field.relatedName } },
            _id: field.resource,
          })
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
        for (const field of fields) { // For each field in the form being saved
          const oldField = oldFields.find((x) => x.name === field.name); // Find the equivalent field in the ressource's fields
          if (!oldField) { // If the field isn't found in the resource
            const newField: any = Object.assign({}, field); // Create a copy of the form's field
            newField.isRequired = form.core && field.isRequired ? true : false; // If it's a core form and the field isRequired, copy this property
            oldFields.push(newField); // Add this field to the list of the resource's fields
          } else {
            // Check if field can be updated
            if (!oldField.isCore || oldField.isCore && form.core) { //If resource's field isn't core or if it's core but the edited form is core too, make it writable
              if (!isEqual(oldField, field)) { // If the resource's field and the current form's field are different
                const index = oldFields.findIndex((x) => x.name === field.name); // Get the index of the form's field in the resources
                oldFields.splice(index, 1, field); // Replace resource's field by the form's field
                // === REFLECT UPDATE ===
                for (const childForm of childForms) { // For each form that inherits from the same resource

                  childForm.fields = childForm.fields.map(x => { // For each field of the childForm
                    return (x.name === field.name) ? // If the child field's name equals the parent field's name
                      ((x.hasOwnProperty('defaultValue') && (x.defaultValue !== oldField.defaultValue)) ? // If the child possesses the "defaultValue" property
                        { ...field, defaultValue: x.defaultValue } // Replace child's field by parent's field with child's field defaultValue's value
                        : field) // Else replace child's field by parent's field
                      : x; // Else don't change the child's field
                  });

                  // Update structure
                  const newStructure = JSON.parse(childForm.structure); // Get the inheriting form's structure
                  const prevStructure = JSON.parse(form.structure); // Get the current form's state structure

                  replaceField(field.name, newStructure, structure, prevStructure); // Replace the inheriting form's field by the edited form's field

                  childForm.structure = JSON.stringify(newStructure); // Save the new structure
                  // Update form
                  const formUpdate = {
                    structure: childForm.structure,
                    fields: childForm.fields,
                  };
                  await Form.findByIdAndUpdate(childForm._id, formUpdate, { new: true });
                }
              }
            }
          }
        }

        // Check if there are unused or duplicated fields in the resource
        for (let index = 0; index < oldFields.length; index++) {
          const field = oldFields[index]; // Store the resource's field
          const fieldToRemove =
            (form.core ? !fields.some(x => x.name === field.name) : true) // If edited form is core, check if resource's field is absent from form's fields
            &&
            !usedFields.some(x => x.name === field.name) // Unused -- TODO What if it's in one inherited form and not in another ?
            ||
            oldFields.some((x, id) => field.name === x.name && id !== index); // Duplicated If there's another field with the same name but not the same ID
          if (fieldToRemove) {
            oldFields.splice(index, 1);
            index--;
          }
        }
        if (!form.core) {
          // Check if a required field is missing
          // Keep old version and move that to extract fields ? 
          let fieldExists = false;
          for (const field of oldFields.filter(x => x.isCore)) { // For each non-core field in the resource
            for (const x of fields) {
              if (x.name === field.name) {
                x.isCore = true;
                fieldExists = true;
              }
            }
            if (!fieldExists) {
              throw new GraphQLError(errors.coreFieldMissing(field.name));
            }
            fieldExists = false;
          }
        } else {
          // === REFLECT DELETION ===
          // For each old field from core form which is not anymore in the current core form fields
          for (const field of form.fields.filter((x) => !fields.some((y) => x.name === y.name))) {
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
                childForm.structure = JSON.stringify(newStructure);
                // Update form
                const formUpdate = {
                  structure: childForm.structure,
                  fields: childForm.fields,
                };
                await Form.findByIdAndUpdate(childForm._id, formUpdate, { new: true });
              }
              // We remove the field from the resource
              const index = oldFields.findIndex(x => x.name === field.name);
              oldFields.splice(index, 1);
            }
          }
          // === REFLECT ADDITION ===
          // For each new field from core form which were not before in the old core form fields
          for (const field of fields.filter((x) => !form.fields.some((y) => x.name === y.name))) {
            for (const childForm of childForms) {
              // Add to fields and structure if needed
              if (!childForm.fields.some(x => x.name === field.name)) {
                childForm.fields.unshift(field);
                const newStructure = JSON.parse(childForm.structure);
                addField(newStructure, field.name, structure);
                childForm.structure = JSON.stringify(newStructure);
                // Update form
                const formUpdate = {
                  structure: childForm.structure,
                  fields: childForm.fields,
                };
                await Form.findByIdAndUpdate(childForm._id, formUpdate, { new: true });
              }
            }
          }
          // === REFLECT STRUCTURE CHANGES
          const structureUpdate = {};

          const prevStructure = JSON.parse(form.structure);
          const newStructure = structure;

          // Store the property's objects that have been removed between the new and previous versions of the form
          for (const property of INHERITED_PROPERTIES) {
            if (!isEqual(prevStructure[property], newStructure[property])) {
              structureUpdate[property] = newStructure[property] ? differenceWith(prevStructure[property], newStructure[property], isEqual) : prevStructure[property];
            }
          }
          // Loop on the resource children
          for (const childForm of childForms) {
            const childStructure = JSON.parse(childForm.structure);
            for (const objectKey in structureUpdate) {
              // In a childForm's structure, if there are property's objects that have been deleted from the core form, delete them there too
              if (childStructure[objectKey] && childStructure[objectKey].length && structureUpdate[objectKey] && structureUpdate[objectKey].length) {
                childStructure[objectKey] = differenceWith(childStructure[objectKey], structureUpdate[objectKey], isEqual);
              }
              // Merge the new property's objects to the children
              childStructure[objectKey] = childStructure[objectKey] ? unionWith(childStructure[objectKey], newStructure[objectKey], isEqual) : newStructure[objectKey];
              // If the property is null, undefined or empty, directly remove the entry from the structure
              if (!childStructure[objectKey] || !childStructure[objectKey].length) { delete childStructure[objectKey]; }
            }
            // Save the updated children forms
            const formUpdate = {
              structure: JSON.stringify(childStructure),
            };
            await Form.findByIdAndUpdate(childForm._id, formUpdate, { new: true });
          }
        }

        // Update resource fields
        await Resource.findByIdAndUpdate(form.resource, {
          fields: oldFields,
        });
      }
      update.fields = fields;
      // Update version
      const version = new Version({
        createdAt: form.modifiedAt ? form.modifiedAt : form.createdAt,
        data: form.structure,
      });
      await version.save();
      update.$push = { versions: version._id };
    }

    // Update status
    if (args.status) {
      update.status = args.status;
      if (update.status === status.active) {
        // Create notification channel
        const notificationChannel = new Channel({
          title: `Form - ${form.name}`,
          form: form._id,
        });
        await notificationChannel.save();
        update.channel = notificationChannel.form;
      } else {
        // delete channel and notifications if form not active anymore
        const channel = await Channel.findOneAndDelete({ form: form._id });
        if (channel) {
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
          name: args.name,
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
        buildTypes();
      },
    );
  },
};
