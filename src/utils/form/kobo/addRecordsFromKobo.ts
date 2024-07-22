import {
  ApiConfiguration,
  Channel,
  Form,
  Record,
  Version,
  Notification,
} from '@models';
import { UserWithAbility } from '@server/apollo/context';
import { logger } from '@services/logger.service';
import { GraphQLError } from 'graphql';
import config from 'config';
import axios from 'axios';
import { cloneDeep, isEqual } from 'lodash';
import { transformRecord } from '../transformRecord';
import { getNextId } from '../getNextId';
import pubsub from '../../../server/pubsub';
import * as CryptoJS from 'crypto-js';

/**
 * From the kobo data submission, extract the form data.
 *
 * @param submission kobo data submission
 * @param fields Oort form fields
 * @param fieldsNames Array with the fields names
 * @returns data object for the record
 */
const getData = (submission: any, fields: any, fieldsNames: string[]) => {
  // Filter submission object, keeping only questions data
  for (const key in submission) {
    if (!fieldsNames.includes(key)) {
      delete submission[key];
    }
  }
  return transformRecord(submission, fields);
};

/**
 * For a form created from a Kobotoolbox form, import data submissions to create records.
 *
 * @param form form created from Kobo
 * @param apiConfiguration api configuration with Kobo settings
 * @param user user synchronizing Kobo data
 * @returns true of false, if sync is successful
 */
export const addRecordsFromKobo = async (
  form: Form,
  apiConfiguration: ApiConfiguration,
  user?: UserWithAbility
) => {
  try {
    if (apiConfiguration) {
      const url = `https://kf.kobotoolbox.org/api/v2/assets/${form.kobo.id}/data.json`;
      const settings = JSON.parse(
        CryptoJS.AES.decrypt(
          apiConfiguration.settings,
          config.get('encryption.key')
        ).toString(CryptoJS.enc.Utf8)
      );
      const response = await axios.get(url, {
        headers: {
          // settings.tokenPrefix MUST be 'Token'
          Authorization: `Token ${settings.token}`,
        },
      });
      let submissions = response.data.results;
      // Only data submissions sent when the form was in the same version as when it was imported will be used to create records
      if (form.kobo.dataFromDeployedVersion) {
        submissions = submissions.filter(
          (submission: any) =>
            submission.__version__ === form.kobo.deployedVersionId
        );
      }
      console.log('--- submissions:', submissions);
      if (!submissions.length) {
        // Nothing to synchronize
        return false;
      } else {
        // Get existing records already rested from data synchronization with kobo
        const oldRecords = await Record.find({
          form: form.id,
          koboId: { $ne: null },
        });

        const versionsToCreate: Version[] = [];
        const recordsToCreate: Record[] = [];
        const recordsToUpdate: Record[] = [];
        const fieldsNames = form.fields.map((field: any) => field.name);

        for (const submission of submissions) {
          const oldRecord = oldRecords.find((rec: Record) => {
            const submissionId = Object.prototype.hasOwnProperty.call(
              submission,
              'meta/rootUuid'
            )
              ? submission['meta/rootUuid']
              : submission._uuid;
            return rec.koboId === submissionId;
          });
          if (oldRecord) {
            const recordToUpdate = cloneDeep(oldRecord);
            const data = getData(submission, form.fields, fieldsNames);
            recordToUpdate.data = { ...recordToUpdate.data, ...data };
            if (!isEqual(oldRecord.data, recordToUpdate.data)) {
              const version = new Version({
                createdAt: oldRecord.modifiedAt
                  ? oldRecord.modifiedAt
                  : oldRecord.createdAt,
                data: oldRecord.data,
                createdBy: user?.id,
              });
              recordToUpdate.versions.push(version);
              recordToUpdate.markModified('versions');
              recordToUpdate.modifiedAt = new Date();
              versionsToCreate.push(version);
              recordsToUpdate.push(recordToUpdate);
            }
            // Records already exists, check if data changed on Kobo and we need to updated it here
          } else {
            // Create record from submission data
            const koboId = Object.prototype.hasOwnProperty.call(
              submission,
              'meta/rootUuid'
            )
              ? submission['meta/rootUuid']
              : submission._uuid;
            const { incrementalId, incID } = await getNextId(
              String(form.resource ? form.resource : form.id)
            );
            const data = getData(submission, form.fields, fieldsNames);
            const record = new Record({
              incrementalId,
              incID,
              form: form.id,
              data,
              resource: form.resource ? form.resource : null,
              koboId,
              ...(user && {
                createdBy: {
                  user: user._id,
                  roles: user.roles.map((x) => x._id),
                  positionAttributes: user.positionAttributes.map((x) => {
                    return {
                      value: x.value,
                      category: x.category._id,
                    };
                  }),
                },
              }),
              lastUpdateForm: form.id,
              ...(user && {
                _createdBy: {
                  user: {
                    _id: user?._id,
                    name: user?.name,
                    username: user?.username,
                  },
                },
              }),
              _form: {
                _id: form._id,
                name: form.name,
              },
              _lastUpdateForm: {
                _id: form._id,
                name: form.name,
              },
            });
            recordsToCreate.push(record);
          }
        }

        const recordsToSave = [...recordsToCreate, ...recordsToUpdate];
        // If no new data, return
        if (!recordsToSave.length) {
          return false;
        } else {
          // Save all changes
          try {
            await Version.bulkSave(versionsToCreate);
            await Record.bulkSave(recordsToSave);
            // Send notifications to channel
            const channel = await Channel.findOne({ form: form._id });
            if (channel) {
              const notification = new Notification({
                action: `Records created from Kobo synchronized data submissions - ${form.name}`,
                content: '',
                channel: channel.id,
                seenBy: [],
              });
              await notification.save();
              const publisher = await pubsub();
              publisher.publish(channel.id, { notification });
            }
            return true;
          } catch (err2) {
            logger.error(err2.message, { stack: err2.stack });
            throw new GraphQLError('Internal Server Error');
          }
        }
      }
    }
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    if (err instanceof GraphQLError) {
      throw new GraphQLError(err.message);
    }
    throw new GraphQLError('Internal Server Error');
  }
};
