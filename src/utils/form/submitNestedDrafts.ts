import { GraphQLError } from 'graphql';
import { isObjectIdOrHexString } from 'mongoose';
import { castArray, omit } from 'lodash';
import { Channel, Form, Notification, Record, Resource } from '@models';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { Context } from '@server/apollo/context';
import { logger } from '@services/logger.service';
import { getErrorMessage, getErrorStack } from '@utils/error';
import pubsub from '../../server/pubsub';
import { getNextId } from './getNextId';
import { UniquenessError, validateUniqueness } from './validateUniqueness';

/** Draft record referenced by a submitted record, with the form it belongs to */
export type NestedDraft = {
  draft: Record;
  form: Form;
};

/** What is needed to submit the drafts of a form */
type DraftFormContext = {
  form: Form | null;
  resource: Resource | null;
  canCreate: boolean;
};

/**
 * Removes the draft flag of the files of a record. Draft files are saved in
 * the back-end storage along with a draft record: once the record is
 * submitted, a file still there is in its final storage.
 *
 * @param data Data of the record, edited in place
 * @param fields Fields of the form of the record
 * @returns Data of the record
 */
export const clearDraftFiles = (data: any, fields: any[]): any => {
  for (const field of fields || []) {
    const value = field.type === 'file' ? data?.[field.name] : null;
    if (Array.isArray(value) && value.some((file) => file?.draft)) {
      data[field.name] = value.map((file) =>
        file?.draft ? omit(file, 'draft') : file
      );
    }
  }
  return data;
};

/**
 * Notifies the channel of a form, if any, that a record has been added.
 *
 * @param record Added record
 * @param form Form of the record
 */
export const notifyRecordAdded = async (
  record: Record,
  form: Form
): Promise<void> => {
  const channel = await Channel.findOne({ form: form._id });
  if (!channel) {
    return;
  }
  const notification = new Notification({
    action: `New record - ${form.name}`,
    content: record,
    channel: channel.id,
    seenBy: [],
  });
  await notification.save();
  const publisher = await pubsub();
  publisher.publish(channel.id, { notification });
};

/**
 * Gets the ids of the records selected in the resource(s) questions of a
 * record.
 *
 * @param data Data of the record
 * @param fields Fields of the form of the record
 * @returns Ids of the referenced records
 */
const getReferencedIds = (data: any, fields: any[]): string[] => {
  const ids: string[] = [];
  for (const field of fields || []) {
    if (field.type !== 'resource' && field.type !== 'resources') {
      continue;
    }
    for (const id of castArray(data?.[field.name] ?? [])) {
      if (id && isObjectIdOrHexString(id)) {
        ids.push(String(id));
      }
    }
  }
  return ids;
};

/**
 * Gets the drafts to submit along with a record: the ones the user created
 * from its resource(s) questions ( "add new record" ), and, whatever the
 * depth, the ones created the same way from these drafts.
 *
 * Nothing is saved: the drafts are only checked, so the record is not saved
 * if one of them cannot be submitted. Only the drafts of the user are
 * submitted, as they are the only ones the user can see and edit.
 *
 * @param data Data of the record being submitted
 * @param fields Fields of the form of the record
 * @param context Request context
 * @returns Drafts to submit with {@link submitNestedDrafts}, the deepest first
 * @throws If the user cannot add records to the form of a draft, or if a draft
 * breaks a blocking uniqueness rule
 */
export const getNestedDrafts = async (
  data: any,
  fields: any[],
  context: Context
): Promise<NestedDraft[]> => {
  const user = context.user;
  // Drafts belong to a user
  if (!user) {
    return [];
  }
  const t = context.i18next.t.bind(context.i18next);
  const nestedDrafts: NestedDraft[] = [];
  /** Records checked already: records can reference each other */
  const visited = new Set<string>();
  const formContexts = new Map<string, DraftFormContext>();

  /**
   * Gets the form of a draft, with what is needed to submit the draft.
   *
   * @param formId Id of the form
   * @returns Form, resource and whether the user can add records to the form
   */
  const getFormContext = async (formId: any): Promise<DraftFormContext> => {
    const key = String(formId);
    if (!formContexts.has(key)) {
      const form = await Form.findById(formId);
      formContexts.set(key, {
        form,
        resource: form?.resource
          ? await Resource.findById(form.resource)
          : null,
        canCreate: form
          ? (await extendAbilityForRecords(user, form)).can('create', 'Record')
          : false,
      });
    }
    return formContexts.get(key);
  };

  /**
   * Collects the drafts referenced by a record, the deepest first.
   *
   * @param recordData Data of the record
   * @param recordFields Fields of the form of the record
   */
  const collect = async (recordData: any, recordFields: any[]) => {
    const ids = getReferencedIds(recordData, recordFields).filter(
      (id) => !visited.has(id)
    );
    if (!ids.length) {
      return;
    }
    ids.forEach((id) => visited.add(id));
    const drafts = await Record.find({
      _id: { $in: ids },
      draft: true,
      archived: { $ne: true },
      'createdBy.user': user._id,
    });
    for (const draft of drafts) {
      const { form, resource, canCreate } = await getFormContext(draft.form);
      if (!form) {
        continue;
      }
      // Submitting a draft is adding a record
      if (!canCreate) {
        throw new GraphQLError(t('common.errors.permissionNotGranted'));
      }
      // Drafts are not checked against the uniqueness rules until submitted
      const { errors } = await validateUniqueness(
        draft.data,
        resource,
        draft._id,
        t,
        context
      );
      if (errors.length) {
        throw new UniquenessError(errors);
      }
      await collect(draft.data, form.fields);
      nestedDrafts.push({ draft, form });
    }
  };

  await collect(data, fields);
  return nestedDrafts;
};

/**
 * Submits a draft: as for any submitted draft, a record is inserted from it
 * and the draft is deleted. The record keeps the id of the draft, so the
 * records referencing it are left untouched.
 *
 * @param nestedDraft Draft to submit
 * @param nestedDraft.draft Draft record
 * @param nestedDraft.form Form of the draft
 * @returns Submitted record, null if the draft does not exist anymore
 */
const submitDraft = async ({
  draft,
  form,
}: NestedDraft): Promise<Record | null> => {
  const filter = { _id: draft._id, draft: true };
  // Only use an incremental id if the draft is still there
  if (!(await Record.exists(filter))) {
    return null;
  }
  const incrementalId = await getNextId(String(form.resource || form._id));
  // Take the draft before inserting the record: the deletion is atomic, so a
  // draft submitted twice at the same time only gives one record. The driver
  // is called directly to skip the deletion hook of the model: the versions
  // of the draft are moved to the record, not deleted
  const consumedDraft = (await Record.collection.findOneAndDelete(filter))
    .value;
  if (!consumedDraft) {
    return null;
  }
  const record = new Record({
    ...omit(consumedDraft, ['createdAt', 'modifiedAt', '__v']),
    incrementalId,
    data: clearDraftFiles({ ...consumedDraft.data }, form.fields),
    draft: false,
  });
  try {
    await record.save();
  } catch (err) {
    // The record could not be saved: give the user their draft back
    await Record.collection.insertOne(consumedDraft);
    throw err;
  }
  return record;
};

/**
 * Submits the drafts referenced by a record, once the record is saved.
 *
 * A draft that cannot be submitted does not fail the request, as the record
 * is saved already: the draft is left as it is, and submitted the next time
 * the record is saved.
 *
 * @param nestedDrafts Drafts to submit, from {@link getNestedDrafts}
 */
export const submitNestedDrafts = async (
  nestedDrafts: NestedDraft[]
): Promise<void> => {
  for (const nestedDraft of nestedDrafts) {
    try {
      const record = await submitDraft(nestedDraft);
      if (record) {
        await notifyRecordAdded(record, nestedDraft.form);
      }
    } catch (err) {
      const draftId = String(nestedDraft.draft._id);
      logger.error(
        `Could not submit the draft record ${draftId}: ${getErrorMessage(err)}`,
        { stack: getErrorStack(err) }
      );
    }
  }
};
