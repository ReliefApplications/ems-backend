import { GraphQLError } from 'graphql';
import { omit } from 'lodash';
import { Form } from '@models';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { Context } from '@server/apollo/context';
import { logger } from '@services/logger.service';
import {
  DocumentItem,
  uploadDocument,
} from '@utils/commonServices/uploadDocument';
import { getErrorMessage, getErrorStack } from '@utils/error';
import { downloadFileBuffer } from '@utils/files/downloadFile';

/** Container of the back-end storage holding the files of the records */
const RECORD_FILES_CONTAINER = 'forms';

/** Path of a record file in the back-end storage: form id, then blob name */
const RECORD_FILE_PATH = /^([0-9a-fA-F]{24})\/[^/]+$/;

/**
 * What is shared between the draft files submitted by a request: the same
 * file is only uploaded once, and the forms are only checked once.
 */
export type DraftFilesCache = {
  /** Document management item, per back-end storage path */
  uploads: Map<string, DocumentItem>;
  /** Whether the user can read the files of a form, per form id */
  readableForms: Map<string, boolean>;
};

/**
 * Creates the cache shared between the draft files submitted by a request.
 *
 * @returns Empty cache
 */
export const createDraftFilesCache = (): DraftFilesCache => ({
  uploads: new Map(),
  readableForms: new Map(),
});

/**
 * Checks if the user can read the files saved in the back-end storage for a
 * form, as when downloading them.
 *
 * @param formId Id of the form
 * @param context Request context
 * @param cache Cache of the request
 * @returns True if the user can read the files of the form
 */
const canReadFormFiles = async (
  formId: string,
  context: Context,
  cache: DraftFilesCache
): Promise<boolean> => {
  if (!cache.readableForms.has(formId)) {
    const form = await Form.findById(formId);
    cache.readableForms.set(
      formId,
      !!form &&
        (await extendAbilityForRecords(context.user, form)).can('read', form)
    );
  }
  return cache.readableForms.get(formId);
};

/**
 * Uploads a draft file to document management, from the back-end storage.
 * The file is uploaded on behalf of the user, with the properties the client
 * saved in the file.
 *
 * @param file Draft file
 * @param context Request context
 * @param cache Cache of the request
 * @returns Document management item of the file
 */
const uploadDraftFile = async (
  file: any,
  context: Context,
  cache: DraftFilesCache
): Promise<DocumentItem> => {
  const path: string = file.content;
  if (cache.uploads.has(path)) {
    return cache.uploads.get(path);
  }
  if (!context.accesstoken) {
    throw new Error('No access token to upload the file with');
  }
  if (typeof file.upload.driveId !== 'string' || !file.upload.driveId) {
    throw new Error('No drive to upload the file to');
  }
  const formId = RECORD_FILE_PATH.exec(path)?.[1];
  if (!formId || !(await canReadFormFiles(formId, context, cache))) {
    throw new Error('The file cannot be read');
  }
  const item = await uploadDocument(
    {
      name: file.name,
      data: await downloadFileBuffer(RECORD_FILES_CONTAINER, path),
    },
    file.upload,
    String(context.accesstoken)
  );
  cache.uploads.set(path, item);
  return item;
};

/**
 * Moves the draft files of a record being submitted to their final storage.
 *
 * Draft files are saved in the back-end storage along with a draft record.
 * When the client uses document management, it saves in each draft file how
 * to upload it there ( drive and document properties, from the file
 * question ): the file is then uploaded to document management. Otherwise,
 * the back-end storage is the final storage of the file. Either way, the file
 * is not a draft file anymore.
 *
 * @param data Data of the record, edited in place
 * @param fields Fields of the form of the record
 * @param context Request context
 * @param cache Cache of the request, when it submits several records
 * @returns Names of the edited fields
 * @throws If a file cannot be uploaded: the record must not be submitted
 */
export const submitDraftFiles = async (
  data: any,
  fields: any[],
  context: Context,
  cache: DraftFilesCache = createDraftFilesCache()
): Promise<string[]> => {
  const editedFields: string[] = [];
  for (const field of fields || []) {
    const value = field.type === 'file' ? data?.[field.name] : null;
    if (!Array.isArray(value) || !value.some((file) => file?.draft)) {
      continue;
    }
    const files = [];
    for (const file of value) {
      if (!file?.draft) {
        files.push(file);
        continue;
      }
      const submitted = omit(file, ['draft', 'upload']);
      if (file.upload && typeof file.content === 'string') {
        try {
          submitted.content = await uploadDraftFile(file, context, cache);
        } catch (err) {
          logger.error(
            `Could not upload the draft file ${file.name} ( ${
              file.content
            } ) to document management: ${getErrorMessage(err)}`,
            { stack: getErrorStack(err) }
          );
          throw new GraphQLError(
            `${context.i18next.t(
              'utils.files.uploadFile.errors.fileCannotBeUploaded'
            )} ( ${file.name} )`
          );
        }
      }
      files.push(submitted);
    }
    data[field.name] = files;
    editedFields.push(field.name);
  }
  return editedFields;
};
