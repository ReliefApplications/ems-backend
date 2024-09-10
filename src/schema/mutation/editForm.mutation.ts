import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLString,
  GraphQLError,
  GraphQLBoolean,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { Form, Resource, Version, Channel, ReferenceData } from '@models';
import {
  removeField,
  addField,
  replaceField,
  findDuplicateFields,
  extractFields,
} from '@utils/form';
import { FormType } from '../types';
import { validateGraphQLTypeName } from '@utils/validators';
import mongoose from 'mongoose';
import { AppAbility } from '@security/defineUserAbility';
import { status, StatusEnumType, StatusType } from '@const/enumTypes';
import isEqual from 'lodash/isEqual';
import differenceWith from 'lodash/differenceWith';
import unionWith from 'lodash/unionWith';
import i18next from 'i18next';
import { get, isArray, isNil } from 'lodash';
import { logger } from '@lib/logger';
import checkDefaultFields from '@utils/form/checkDefaultFields';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';
import { scheduleKoboSync } from '@server/koboSyncScheduler';

/**
 * List of keys of the structure's object which we want to inherit to the children forms when they are modified on the core form
 * If a trigger is removed from the core form, we will remove it from the children forms, same for the calculatedValues.
 * Other keys can be added here
 */
const INHERITED_PROPERTIES = [
  'triggers',
  'calculatedValues',
  'onCompleteExpression',
];

/** Simple form permission change type */
type SimplePermissionChange =
  | {
      add?: string[];
      remove?: string[];
    }
  | string[];

/** Access form permission change type */
type AccessPermissionChange =
  | {
      add?: { role: string; access?: any }[];
      remove?: { role: string; access?: any }[];
    }
  | { role: string; access?: any }[];

/** Type for the permission argument */
type PermissionChange = {
  canSee?: SimplePermissionChange;
  canUpdate?: SimplePermissionChange;
  canDelete?: SimplePermissionChange;
  canCreateRecords?: SimplePermissionChange;
  canSeeRecords?: AccessPermissionChange;
  canUpdateRecords?: AccessPermissionChange;
  canDeleteRecords?: AccessPermissionChange;
  recordsUnicity?: AccessPermissionChange;
};

/** Arguments for the editForm mutation */
type EditFormArgs = {
  id: string | mongoose.Types.ObjectId;
  structure?: any;
  status?: StatusType;
  name?: string;
  cronSchedule?: string;
  permissions?: any;
  dataFromDeployedVersion?: boolean;
};

/**
 * Edit a form, finding it by its id. User must be authorized to perform the update.
 * Throw an error if not logged or authorized, or if arguments are invalid.
 */
export default {
  type: FormType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    structure: { type: GraphQLJSON },
    status: { type: StatusEnumType },
    name: { type: GraphQLString },
    cronSchedule: { type: GraphQLString },
    permissions: { type: GraphQLJSON },
    dataFromDeployedVersion: { type: GraphQLBoolean },
  },
  async resolve(parent, args: EditFormArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      // Permission check
      const ability: AppAbility = user.ability;
      const form = await Form.findById(args.id);
      if (ability.cannot('update', form)) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }

      // Initialize the update object --- TODO = put interface
      /* const update: any = {
    modifiedAt: new Date(),
  }; */
      const update: any = {};

      // Update name
      if (args.name) {
        const graphQLTypeName = Form.getGraphQLTypeName(args.name);
        validateGraphQLTypeName(
          Form.getGraphQLTypeName(args.name),
          context.i18next
        );
        if (
          (await Form.hasDuplicate(graphQLTypeName, form.id)) ||
          (await ReferenceData.hasDuplicate(graphQLTypeName))
        ) {
          throw new GraphQLError(
            context.i18next.t('common.errors.duplicatedGraphQLTypeName')
          );
        }
        update.name = args.name;
        update.graphQLTypeName = Form.getGraphQLTypeName(args.name);
        if (form.core) {
          await Resource.findByIdAndUpdate(form.resource, {
            name: args.name,
          });
        }
      }

      // Update status
      if (args.status) {
        update.status = args.status;
        // Activate the form.
        if (update.status === status.active) {
          // Create notification channel
          const notificationChannel = new Channel({
            title: `Form - ${form.name}`,
            form: form._id,
          });
          await notificationChannel.save();
          update.channel = notificationChannel.form;
        } else {
          // Deactivate the form
          // delete channel and notifications if form not active anymore
          const channel = await Channel.findOneAndDelete({ form: form._id });
          if (channel) {
            update.channel = [];
          }
        }
      }

      // Update permissions
      if (args.permissions) {
        const permissions: PermissionChange = args.permissions;
        for (const permission in permissions) {
          if (isArray(permissions[permission])) {
            // if it's an array, replace the old value with the provided list
            update['permissions.' + permission] = permissions[permission];
          } else {
            const obj = permissions[permission];
            if (obj.add && obj.add.length) {
              const pushRoles = {
                [`permissions.${permission}`]: { $each: obj.add },
              };

              if (update.$addToSet) Object.assign(update.$addToSet, pushRoles);
              else Object.assign(update, { $addToSet: pushRoles });
            }
            if (obj.remove && obj.remove.length) {
              let pullRoles: any;

              if (typeof obj.remove[0] === 'string') {
                // CanSee, canUpdate, canDelete, canCreateRecords
                pullRoles = {
                  [`permissions.${permission}`]: {
                    $in: obj.remove.map(
                      (role: any) => new mongoose.Types.ObjectId(role)
                    ),
                  },
                };
              } else {
                // canSeeRecords, canUpdateRecords, canDeleteRecords, recordsUnicity
                pullRoles = {
                  [`permissions.${permission}`]: {
                    $in: obj.remove.map((perm: any) =>
                      perm.access
                        ? {
                            role: new mongoose.Types.ObjectId(perm.role),
                            access: perm.access,
                          }
                        : {
                            role: new mongoose.Types.ObjectId(perm.role),
                          }
                    ),
                  },
                };
              }

              if (update.$pull) Object.assign(update.$pull, pullRoles);
              else Object.assign(update, { $pull: pullRoles });
            }
          }
        }
      }

      // Update kobo info
      if (!isNil(args.dataFromDeployedVersion) || !isNil(args.cronSchedule)) {
        update.kobo = {
          ...form.kobo,
          ...(!isNil(args.cronSchedule) && {
            dataFromDeployedVersion: args.dataFromDeployedVersion,
          }),
          ...(!isNil(args.cronSchedule) && { cronSchedule: args.cronSchedule }),
        };
      }

      // Update fields and structure, check that structure is different
      if (args.structure && !isEqual(form.structure, args.structure)) {
        update.structure = args.structure;
        const structure = JSON.parse(args.structure);

        // Save the allowUploadRecords
        update.allowUploadRecords = structure.allowUploadRecords ?? false;

        const fields = [];
        for (const page of structure.pages) {
          await extractFields(page, fields, form.core);
          findDuplicateFields(fields);
          for (const field of fields.filter((x) =>
            ['resource', 'resources'].includes(x.type)
          )) {
            // Raises an error if the field is already used as related name for this resource
            if (
              await Form.findOne({
                fields: {
                  $elemMatch: {
                    resource: field.resource,
                    relatedName: field.relatedName,
                  },
                },
                _id: { $ne: form.id },
                ...(form.resource && { resource: { $ne: form.resource } }),
              })
            ) {
              throw new GraphQLError(
                i18next.t('mutations.form.edit.errors.relatedNameDuplicated', {
                  name: field.relatedName,
                })
              );
            }
            // Raises an error if the field exists in the resource
            if (
              await Resource.findOne({
                fields: { $elemMatch: { name: field.relatedName } },
                _id: field.resource,
              })
            ) {
              throw new GraphQLError(
                i18next.t('mutations.form.edit.errors.relatedNameDuplicated', {
                  name: field.relatedName,
                })
              );
            }
          }
        }
        // Check if default fields are used
        checkDefaultFields(fields);

        // === Resource inheritance management ===
        const prevStructure = JSON.parse(
          form.structure ? form.structure : '{}'
        ); // Get the current form's state structure
        if (form.resource && !isEqual(prevStructure, structure)) {
          // If the form has a resource and its structure has changed
          const resource = await Resource.findById(form.resource);
          const templates = await Form.find({
            resource: form.resource,
            _id: { $ne: new mongoose.Types.ObjectId(args.id) },
          }).select('_id structure fields');
          const oldFields: any[] = resource.fields
            ? JSON.parse(JSON.stringify(resource.fields))
            : [];
          const usedFields = templates
            .map((x) => x.fields)
            .flat()
            .concat(fields);
          // Check fields against the resource to add new ones or edit old ones
          for (const field of fields) {
            // For each field in the form being saved
            const oldField = oldFields.find((x) => x.name === field.name); // Find the equivalent field in the resource's fields
            if (!oldField) {
              // If the field isn't found in the resource
              const newField: any = Object.assign({}, field); // Create a copy of the form's field
              newField.isRequired =
                form.core && field.isRequired ? true : false; // If it's a core form and the field isRequired, copy this property
              oldFields.push(newField); // Add this field to the list of the resource's fields
            } else {
              // Check if field can be updated
              if (!oldField.isCore || (oldField.isCore && form.core)) {
                // If resource's field isn't core or if it's core but the edited form is core too, make it writable
                const storedFieldChanged = !isEqual(oldField, field);
                if (storedFieldChanged) {
                  const oldCanSee = get(oldField, 'permissions.canSee', []);
                  const oldCanUpdate = get(
                    oldField,
                    'permissions.canUpdate',
                    []
                  );
                  // Inherit the field's permissions
                  field.permissions = {
                    canSee: oldCanSee.map((p) =>
                      typeof p === 'string' ? new mongoose.Types.ObjectId(p) : p
                    ),
                    canUpdate: oldCanUpdate.map((p) =>
                      typeof p === 'string' ? new mongoose.Types.ObjectId(p) : p
                    ),
                  };
                  // If the resource's field and the current form's field are different
                  const index = oldFields.findIndex(
                    (x) => x.name === field.name
                  ); // Get the index of the form's field in the resources
                  oldFields.splice(index, 1, field); // Replace resource's field by the form's field
                }
                for (const template of templates) {
                  // For each form that inherits from the same resource
                  if (storedFieldChanged) {
                    template.fields = template.fields.map((x) => {
                      // For each field of the childForm
                      return x.name === field.name // If the child field's name equals the parent field's name
                        ? x.hasOwnProperty('defaultValue') &&
                          !isEqual(x.defaultValue, oldField.defaultValue) // If the child possesses the "defaultValue" property
                          ? { ...field, defaultValue: x.defaultValue } // Replace child's field by parent's field with child's field defaultValue's value
                          : field // Else replace child's field by parent's field
                        : x; // Else don't change the child's field
                    });
                  }
                  if (!field.generated) {
                    // Update structure
                    const newStructure = JSON.parse(template.structure); // Get the inheriting form's structure
                    replaceField(
                      field.name,
                      newStructure,
                      structure,
                      prevStructure
                    ); // Replace the inheriting form's field by the edited form's field
                    template.structure = JSON.stringify(newStructure); // Save the new structure
                  }
                }
              }
            }
          }
          // Check if there are unused or duplicated fields in the resource
          for (let index = 0; index < oldFields.length; index++) {
            const field = oldFields[index]; // Store the resource's field
            if (!field.isCalculated) {
              // prevent calculated fields to be deleted automatically
              const fieldToRemove =
                ((form.core
                  ? !fields.some((x) => x.name === field.name)
                  : true) && // If edited form is core, check if resource's field is absent from form's fields
                  !usedFields.some((x) => x.name === field.name)) || // Unused -- TODO What if it's in one inherited form and not in another ?
                oldFields.some(
                  (x, id) => field.name === x.name && id !== index
                ); // Duplicated If there's another field with the same name but not the same ID
              if (fieldToRemove) {
                oldFields.splice(index, 1);
                index--;
              }
            }
          }
          // Check if form is a core template of a resource
          if (!form.core) {
            // Check if a required field is missing
            // Keep old version and move that to extract fields ?
            let fieldExists = false;
            for (const field of oldFields.filter((x) => x.isCore)) {
              // For each non-core field in the resource
              for (const x of fields) {
                if (x.name === field.name) {
                  x.isCore = true;
                  fieldExists = true;
                }
              }
              if (!fieldExists) {
                throw new GraphQLError(
                  i18next.t('mutations.form.edit.errors.coreFieldMissing', {
                    name: field.name,
                  })
                );
              }
              fieldExists = false;
            }
          } else {
            // List deleted fields
            const deletedFields = (form.fields || []).filter(
              (x) => !fields.some((y) => x.name === y.name)
            );
            // List new fields
            const newFields = fields.filter(
              (x) => !form.fields.some((y) => x.name === y.name)
            );
            // Detect structure updates
            const structureUpdate = {};
            const newStructure = structure;
            if (form.structure) {
              // Store the property's objects that have been removed between the new and previous versions of the form
              for (const property of INHERITED_PROPERTIES) {
                if (!isEqual(prevStructure[property], newStructure[property])) {
                  structureUpdate[property] = newStructure[property]
                    ? differenceWith(
                        prevStructure[property],
                        newStructure[property],
                        isEqual
                      )
                    : prevStructure[property];
                }
              }
            }

            // Loop on templates
            for (const template of templates) {
              // === REFLECT DELETION ===
              // For each old field from core form which is not anymore in the current core form fields
              for (const field of deletedFields) {
                // Check if we rename or delete a field used in a child form
                if (usedFields.some((x) => x.name === field.name)) {
                  // If this deleted / modified field was used, reflect the deletion / edition
                  const index = template.fields.findIndex(
                    (x) => x.name === field.name
                  );
                  template.fields.splice(index, 1);
                  if (!field.generated) {
                    // Remove from structure
                    const templateStructure = JSON.parse(template.structure);
                    removeField(templateStructure, field.name);
                    template.structure = JSON.stringify(templateStructure);
                  }
                }
              }

              // === REFLECT ADDITION ===
              // For each new field from core form which were not before in the old core form fields
              for (const field of newFields) {
                // Add to fields and structure if needed
                if (!template.fields.some((x) => x.name === field.name)) {
                  template.fields.unshift(field);

                  if (!field.generated) {
                    // Add to structure
                    const templateStructure = JSON.parse(template.structure);
                    addField(templateStructure, field.name, structure);
                    template.structure = JSON.stringify(templateStructure);
                  }
                }
              }

              // REFLECT STRUCTURE CHANGES ===
              const templateStructure = JSON.parse(template.structure);
              for (const objectKey in structureUpdate) {
                // In a childForm's structure, if there are property's objects that have been deleted from the core form, delete them there too
                if (
                  templateStructure[objectKey] &&
                  templateStructure[objectKey].length &&
                  structureUpdate[objectKey] &&
                  structureUpdate[objectKey].length
                ) {
                  templateStructure[objectKey] = differenceWith(
                    templateStructure[objectKey],
                    structureUpdate[objectKey],
                    isEqual
                  );
                }
                // Merge the new property's objects to the children
                templateStructure[objectKey] = templateStructure[objectKey]
                  ? unionWith(
                      templateStructure[objectKey],
                      newStructure[objectKey],
                      isEqual
                    )
                  : newStructure[objectKey];
                // If the property is null, undefined or empty, directly remove the entry from the structure
                if (
                  !templateStructure[objectKey] ||
                  !templateStructure[objectKey].length
                ) {
                  delete templateStructure[objectKey];
                }
              }
              template.structure = JSON.stringify(templateStructure);
            }

            for (const field of deletedFields) {
              // We remove the field from the resource
              const index = oldFields.findIndex((x) => x.name === field.name);
              if (index >= 0) {
                oldFields.splice(index, 1);
              }
            }
          }

          // Build bulk update of non-core templates
          const bulkUpdate = [];
          for (const template of templates) {
            bulkUpdate.push({
              updateOne: {
                filter: { _id: template._id },
                update: {
                  structure: template.structure,
                  fields: template.fields,
                },
              },
            });
          }
          if (bulkUpdate.length > 0) {
            // Update all child form for addition/deletion/structure changes
            await Form.bulkWrite(bulkUpdate);
          }

          // Update resource fields
          await Resource.findByIdAndUpdate(form.resource, {
            fields: oldFields,
          });
        }
        update.fields = fields;
        // Update version
        const version = new Version({
          //createdAt: form.modifiedAt ? form.modifiedAt : form.createdAt,
          data: form.structure,
        });
        await version.save();
        update.$push = { versions: version._id };
      }

      const resForm = await Form.findByIdAndUpdate(args.id, update, {
        new: true,
      });

      // If form was created from Kobo, check if update should stop/update possible scheduled synchronization
      if (resForm.kobo.id) {
        scheduleKoboSync(resForm);
      }

      // Return updated form
      return resForm;
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      if (err instanceof GraphQLError) {
        throw new GraphQLError(err.message);
      }
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
