import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
  GraphQLString,
  GraphQLBoolean,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { Form, Record, Resource, Version } from '@models';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import {
  transformRecord,
  getOwnership,
  checkRecordValidation,
  checkRecordTriggers,
  canEditRecord,
  validateUniqueness,
  UniquenessError,
  logUniquenessError,
  submitRecordDraftFiles,
  getNestedDrafts,
  submitNestedDrafts,
  NestedDraft,
} from '@utils/form';
import { RecordType } from '../types';
import { Types } from 'mongoose';
import { logger } from '@services/logger.service';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';
import { getErrorMessage, getErrorStack } from '@utils/error';

/** Arguments for the editRecord mutation */
export type EditRecordArgs = {
  id: string | Types.ObjectId;
  data?: any;
  version?: string | Types.ObjectId;
  template?: string | Types.ObjectId;
  lang?: string;
  draft?: boolean;
  skipValidation: boolean;
};

/**
 * Edit an existing record.
 * Create also an new version to store previous configuration.
 * Drafts are edited in place, without validation nor history. A draft is
 * submitted with the addRecord mutation, which creates the record and deletes
 * the draft.
 * When a submitted record is edited, the drafts created from its resource(s)
 * questions are submitted along with it, whatever their depth.
 */
export default {
  type: RecordType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    data: { type: GraphQLJSON },
    version: { type: GraphQLID },
    template: { type: GraphQLID },
    lang: { type: GraphQLString },
    draft: { type: GraphQLBoolean },
    skipValidation: { type: GraphQLBoolean, defaultValue: false },
  },
  async resolve(parent, args: EditRecordArgs, context: Context) {
    // Authentication check
    graphQLAuthCheck(context);
    try {
      //
      if (!args.data && !args.version) {
        throw new GraphQLError(
          context.i18next.t('mutations.record.edit.errors.invalidArguments')
        );
      }

      const user = context.user;

      // Get record and form
      const oldRecord: Record = await Record.findById(args.id);
      if (!oldRecord) {
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      }
      const parentForm: Form = await Form.findById(
        oldRecord.form,
        'fields permissions resource structure'
      );
      const parentResource: Resource = await Resource.findById(
        parentForm.resource,
        'fields uniquenessRules'
      );
      if (!parentForm || !parentResource) {
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      }

      // Check permissions: drafts are records being created, so they follow
      // the permission to add records
      const ability = await extendAbilityForRecords(user, parentForm);
      if (!canEditRecord(oldRecord, args.data, ability, parentResource, user)) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }

      // If draft option, return record after running triggers
      if (args.draft) {
        const triggeredRecord = checkRecordTriggers(
          oldRecord,
          args.data,
          parentForm,
          context
        );
        return triggeredRecord;
      }

      const savingDraft = oldRecord.draft === true;

      // Update record
      // Put a try catch for record validation + check the structure of this form
      let validationErrors: { question: string; errors: string[] }[] = [];
      if (!savingDraft) {
        try {
          validationErrors = checkRecordValidation(
            oldRecord,
            args.data,
            parentForm,
            context,
            args.lang
          );
        } catch (err) {
          logger.error(getErrorMessage(err), { stack: getErrorStack(err) });
        }
      }
      validationErrors = validationErrors || [];

      let template: Form | Resource;
      let fields: any[] = [];
      if (args.template && parentForm.resource) {
        template = await Form.findById(args.template, 'name fields resource');
        fields = template.fields;
        if (!(template as Form).resource.equals(parentForm.resource)) {
          throw new GraphQLError(
            context.i18next.t(
              'mutations.record.edit.errors.wrongTemplateProvided'
            )
          );
        }
      } else {
        if (parentForm.resource) {
          template = await Form.findOne({
            resource: parentForm.resource,
            core: true,
          });
          fields = (await Resource.findById(parentForm.resource, 'fields'))
            .fields;
        } else {
          template = parentForm;
          fields = parentForm.fields;
        }
      }
      // Template doesn't exist
      if (!template) {
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      }

      // Data of the record once updated: either the version to revert to, or
      // the edited data, formatted as it is stored so it can be compared with
      // the other records
      let newData: any;
      if (args.version) {
        const oldVersion = await Version.findOne({
          $and: [
            {
              _id: {
                $in: oldRecord.versions.map((x) => new Types.ObjectId(x)),
              },
            },
            { _id: args.version },
          ],
        });
        if (!oldVersion) {
          throw new GraphQLError(
            context.i18next.t('common.errors.dataNotFound')
          );
        }
        newData = oldVersion.data;
      } else {
        transformRecord(args.data, fields);
        newData = { ...oldRecord.data, ...args.data };
      }

      // Check uniqueness rules configured on the resource, if any. As for the
      // validation, drafts are only checked once submitted
      if (!savingDraft) {
        const uniquenessResult = await validateUniqueness(
          newData,
          parentResource,
          oldRecord._id,
          context.i18next.t.bind(context.i18next),
          context
        );
        if (uniquenessResult.errors.length) {
          throw new UniquenessError(uniquenessResult.errors);
        }
        // Reverting to a version cannot be confirmed by the user, so only
        // editions are subject to warnings
        if (!args.version) {
          validationErrors = [
            ...validationErrors,
            ...uniquenessResult.warnings,
          ];
        }
      }

      if (validationErrors.length && !args.skipValidation) {
        return Object.assign(oldRecord, { validationErrors });
      }
      // Drafts created from the resource(s) questions of the record, to submit
      // along with it. The ones of a draft wait for the draft to be submitted
      const nestedDrafts: NestedDraft[] =
        savingDraft || args.version
          ? []
          : await getNestedDrafts(newData, fields, context);
      // Draft files only exist in drafts: the ones of the record, and of the
      // drafts submitted along with it, reach their final storage first
      if (!savingDraft && !args.version) {
        await submitRecordDraftFiles(newData, fields, nestedDrafts, context);
      }
      // Generate new version, from current data. Drafts have no history:
      // every auto-save would otherwise add a version, so the record is
      // edited in place until it is submitted
      const version = savingDraft
        ? null
        : new Version({
            createdAt: oldRecord.modifiedAt
              ? oldRecord.modifiedAt
              : oldRecord.createdAt,
            data: oldRecord.data,
            createdBy: user._id,
          });
      // Classic edition
      if (!args.version) {
        const update: any = {
          data: newData,
          lastUpdateForm: args.template,
          ...(version && { $push: { versions: version._id } }),
          _lastUpdateForm: {
            _id: template._id,
            name: template.name,
          },
          _lastUpdatedBy: {
            user: {
              _id: user._id,
              name: user.name,
              username: user.username,
            },
          },
        };
        const ownership = getOwnership(fields, args.data); // Update with template during merge
        Object.assign(
          update,
          ownership && { createdBy: { ...oldRecord.createdBy, ...ownership } }
        );
        const record = await Record.findByIdAndUpdate(args.id, update, {
          new: true,
        });
        if (version) {
          await version.save();
        }
        await submitNestedDrafts(nestedDrafts);
        return record;
      } else {
        // Revert an old version
        const update: any = {
          data: newData,
          lastUpdateForm: args.template,
          _lastUpdateForm: {
            _id: template._id,
            name: template.name,
          },
          _lastUpdatedBy: {
            user: {
              _id: user._id,
              name: user.name,
              username: user.username,
            },
          },
          ...(version && { $push: { versions: version._id } }),
        };
        const record = Record.findByIdAndUpdate(args.id, update, { new: true });
        if (version) {
          await version.save();
        }
        return await record;
      }
    } catch (err) {
      if (err instanceof UniquenessError) {
        logUniquenessError(err);
        throw new GraphQLError(err.message);
      }
      logger.error(getErrorMessage(err), { stack: getErrorStack(err) });
      if (err instanceof GraphQLError) {
        throw new GraphQLError(err.message);
      }
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
