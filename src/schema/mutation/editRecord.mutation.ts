import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
  GraphQLString,
  GraphQLBoolean,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import {
  Channel,
  Form,
  Notification,
  Record,
  Resource,
  Version,
} from '@models';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { getFormPermissionFilter } from '@utils/filter';
import {
  transformRecord,
  getOwnership,
  checkRecordValidation,
  checkRecordTriggers,
  hasInaccessibleFields,
  getNextId,
} from '@utils/form';
import { RecordType } from '../types';
import { Types } from 'mongoose';
import { logger } from '@services/logger.service';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';
import { getErrorMessage, getErrorStack } from '@utils/error';
import pubsub from '../../server/pubsub';

/** Arguments for the editRecord mutation */
type EditRecordArgs = {
  id: string | Types.ObjectId;
  data?: any;
  version?: string | Types.ObjectId;
  template?: string | Types.ObjectId;
  lang?: string;
  draft?: boolean;
  updateDraftStatus?: boolean;
  skipValidation: boolean;
};

/**
 * Publishes a notification when a draft becomes a submitted record.
 *
 * @param record Published record.
 * @param form Parent form.
 */
const publishDraftSubmissionNotification = async (
  record: Record,
  form: Form
): Promise<void> => {
  const channel = await Channel.findOne({ form: form._id });
  if (!channel) {
    return;
  }

  const notification = new Notification({
    action: `New record published - ${form.name}`,
    content: record,
    channel: channel.id,
    seenBy: [],
  });
  await notification.save();
  const publisher = await pubsub();
  publisher.publish(channel.id, { notification });
};

/**
 * Builds updates needed when converting a draft into a submitted record.
 *
 * @param oldRecord Existing draft record.
 * @param form Parent form.
 * @param user Current user.
 * @param context GraphQL context.
 * @returns Update fields for draft publication.
 */
const getDraftPublicationUpdate = async (
  oldRecord: Record,
  form: Form,
  user: Context['user'],
  context: Context
): Promise<Partial<Record>> => {
  if (
    form.permissions.recordsUnicity &&
    form.permissions.recordsUnicity.length > 0 &&
    form.permissions.recordsUnicity[0].role
  ) {
    const unicityFilters = getFormPermissionFilter(
      user,
      form,
      'recordsUnicity'
    );
    if (unicityFilters.length > 0) {
      const uniqueRecordAlreadyExists = await Record.exists({
        $and: [
          {
            form: form._id,
            archived: { $ne: true },
            draft: { $ne: true },
            _id: { $ne: oldRecord._id },
          },
          { $or: unicityFilters },
        ],
      });
      if (uniqueRecordAlreadyExists) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }
    }
  }

  return {
    draft: false,
    ...(!oldRecord.incrementalId && {
      incrementalId: await getNextId(
        String(form.resource ? form.resource : oldRecord.form)
      ),
    }),
  };
};

/**
 * Edit an existing record.
 * Create also an new version to store previous configuration.
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
    updateDraftStatus: { type: GraphQLBoolean },
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
        'fields'
      );
      if (!parentForm || !parentResource) {
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      }

      // Check permissions with two layers
      const ability = await extendAbilityForRecords(user, parentForm);
      if (
        ability.cannot('update', oldRecord) ||
        hasInaccessibleFields(oldRecord, args.data, ability, parentResource)
      ) {
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

      const publishingDraft =
        oldRecord.draft === true && args.updateDraftStatus === false;
      const savingDraft = oldRecord.draft === true && !publishingDraft;

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
      if (validationErrors.length && !args.skipValidation) {
        return Object.assign(oldRecord, { validationErrors });
      }
      // Generate new version, from current data
      const version = new Version({
        createdAt: oldRecord.modifiedAt
          ? oldRecord.modifiedAt
          : oldRecord.createdAt,
        data: oldRecord.data,
        createdBy: user._id,
      });
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
      // Classic edition
      if (!args.version) {
        transformRecord(args.data, fields);
        const update: any = {
          data: { ...oldRecord.data, ...args.data },
          lastUpdateForm: args.template,
          $push: { versions: version._id },
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
        if (args.updateDraftStatus !== undefined) {
          Object.assign(
            update,
            publishingDraft
              ? await getDraftPublicationUpdate(
                  oldRecord,
                  parentForm,
                  user,
                  context
                )
              : { draft: args.updateDraftStatus }
          );
        }
        const ownership = getOwnership(fields, args.data); // Update with template during merge
        Object.assign(
          update,
          ownership && { createdBy: { ...oldRecord.createdBy, ...ownership } }
        );
        const record = await Record.findByIdAndUpdate(args.id, update, {
          new: true,
        });
        await version.save();
        if (publishingDraft && record) {
          await publishDraftSubmissionNotification(record, parentForm);
        }
        return record;
      } else {
        // Revert an old version
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
        const update: any = {
          data: oldVersion.data,
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
          $push: { versions: version._id },
        };
        if (args.updateDraftStatus !== undefined) {
          Object.assign(
            update,
            publishingDraft
              ? await getDraftPublicationUpdate(
                  oldRecord,
                  parentForm,
                  user,
                  context
                )
              : { draft: args.updateDraftStatus }
          );
        }
        const record = Record.findByIdAndUpdate(args.id, update, { new: true });
        await version.save();
        const updatedRecord = await record;
        if (publishingDraft && updatedRecord) {
          await publishDraftSubmissionNotification(updatedRecord, parentForm);
        }
        return updatedRecord;
      }
    } catch (err) {
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
