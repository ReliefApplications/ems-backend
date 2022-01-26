import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import errors from '../../const/errors';
import { Form, Record, Resource, Version } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import { transformRecord, getOwnership } from '../../utils/form';
import { RecordType } from '../types';
import { getFormPermissionFilter } from '../../utils/filter';
import mongoose from 'mongoose';

export default {
  /*  Edits an existing record.
        Create also an new version to store previous configuration.
    */
  type: RecordType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    data: { type: GraphQLJSON },
    version: { type: GraphQLID },
    template: { type: GraphQLID },
  },
  async resolve(parent, args, context) {
    if (!args.data && !args.version) {
      throw new GraphQLError(errors.invalidEditRecordArguments);
    }
    // Authentication check
    const user = context.user;
    if (!user) { throw new GraphQLError(errors.userNotLogged); }

    const ability: AppAbility = user.ability;
    const oldRecord: Record = await Record.findById(args.id);
    let canUpdate = false;
    const parentForm: Form = await Form.findById(oldRecord.form, 'fields permissions resource');
    // Check permissions with two layers
    if (oldRecord && ability.can('update', oldRecord)) {
      canUpdate = true;
    } else {
      const permissionFilters = getFormPermissionFilter(user, parentForm, 'canUpdateRecords');
      canUpdate = permissionFilters.length > 0 ? await Record.exists({ $and: [{ _id: args.id }, { $or: permissionFilters }] }) : !parentForm.permissions.canUpdateRecords.length;
    }
    if (canUpdate) {
      const version = new Version({
        createdAt: oldRecord.modifiedAt ? oldRecord.modifiedAt : oldRecord.createdAt,
        data: oldRecord.data,
        createdBy: user.id,
      });
      if (!args.version) {
        let template: Form | Resource;
        if (args.template) {
          template = await Form.findById(args.template, 'fields resource');
          if (!template.resource.equals(parentForm.resource)) {
            throw new GraphQLError(errors.wrongTemplateProvided);
          }
        } else {
          if (parentForm.resource) {
            template = await Resource.findById(parentForm.resource, 'fields');
          } else {
            template = parentForm;
          }
        }
        await transformRecord(args.data, template.fields);
        const update: any = {
          data: { ...oldRecord.data, ...args.data },
          modifiedAt: new Date(),
          $push: { versions: version._id },
        };
        const ownership = getOwnership(template.fields, args.data); // Update with template during merge
        Object.assign(update, 
          ownership && { createdBy : { ...oldRecord.createdBy, ...ownership } },
        );
        const record = Record.findByIdAndUpdate(
          args.id,
          update,
          { new: true },
        );
        await version.save();
        return record;
      } else {
        const oldVersion = await Version.findOne({
          $and: [
            { _id: { $in: oldRecord.versions.map(x => mongoose.Types.ObjectId(x)) } },
            { _id: args.version },
          ],
        });
        const update: any = {
          data: oldVersion.data,
          modifiedAt: new Date(),
          $push: { versions: version._id },
        };
        const record = Record.findByIdAndUpdate(
          args.id,
          update,
          { new: true },
        );
        await version.save();
        return record;
      }
    } else {
      throw new GraphQLError(errors.permissionNotGranted);
    }
  },
};
