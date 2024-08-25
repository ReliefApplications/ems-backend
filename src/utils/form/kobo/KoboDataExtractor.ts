/* eslint-disable @typescript-eslint/naming-convention */
import { Channel, Form, Record, Version, Notification } from '@models';
import { UserWithAbility } from '@server/apollo/context';
import { GraphQLError } from 'graphql';
import config from 'config';
import axios from 'axios';
import { isEqual, set } from 'lodash';
import { transformRecord } from '../transformRecord';
import { getNextId } from '../getNextId';
import pubsub from '../../../server/pubsub';
import * as CryptoJS from 'crypto-js';
import { BlobServiceClient } from '@azure/storage-blob';
import { v4 } from 'uuid';

type Field = Form['fields'][number];
type Submission = {
  _id: number;
  _attachments?: {
    download_url: string;
    question_xpath: string;
  }[];
  _uuid?: string;
  'meta/rootUuid'?: string;
  record?: Record;

  [key: string]: any;
};

/** Helper class to extract oort values from kobo entries */
export class KoboDataExtractor {
  /** Kobo API Token */
  koboToken: string;

  /** User that is registered in the records metadata */
  user?: UserWithAbility;

  /** Submissions */
  submissions: Omit<Submission, '_attachments'>[] = [];

  /** Attachments of every submission */
  attachments: Submission['_attachments'] = [];

  /** @returns all the records of the current loaded submissions */
  get questionsByType() {
    const matrixQuestions = [];
    const rankingQuestions = [];
    const booleanQuestions = [];

    this.form.fields.forEach((field) => {
      if (field.type === 'matrixdropdown') {
        matrixQuestions.push(field);
      } else if (field.kobo?.type === 'rank__level') {
        rankingQuestions.push(field);
      } else if (field.type === 'boolean') {
        booleanQuestions.push(field);
      }
    });

    return {
      matrixQuestions,
      rankingQuestions,
      booleanQuestions,
    };
  }

  /**
   * Helper class to extract oort values from kobo entries
   *
   * @param form form definition
   */
  constructor(private form: Form) {
    if (!this.form.kobo.id) {
      throw new GraphQLError(
        '[Fetching Kobo submissions] Form does not have a Kobo ID'
      );
    }

    const koboAPI = (() => {
      try {
        return JSON.parse(
          CryptoJS.AES.decrypt(
            this.form.kobo.apiConfiguration.settings,
            config.get('encryption.key')
          ).toString(CryptoJS.enc.Utf8)
        );
      } catch (_) {
        return null;
      }
    })();

    if (!koboAPI) {
      throw new GraphQLError(
        '[Fetching Kobo submissions] Invalid API configuration'
      );
    }

    this.koboToken = koboAPI.token;

    return this;
  }

  /**
   * Set the user that is registered in the records metadata
   *
   * @param user user to set
   * @returns this instance
   */
  public setUser(user: UserWithAbility) {
    this.user = user;
    return this;
  }

  /** Syncs entries from kobo and save them as records on oort */
  public async sync() {
    // Sleep for a while to avoid rate limiting
    await this.fetchSubmissions();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const newVersions: Version[] = [];
    const newRecords: Record[] = [];
    const updatedRecords: Record[] = [];

    for (const submission of this.submissions) {
      const koboID = submission['meta/rootUuid'] ?? submission._uuid;
      const oldRecord = submission.record;
      const data = await this.extractData(submission);

      if (oldRecord) {
        oldRecord.data = { ...oldRecord.data, ...data };
        if (!isEqual(oldRecord.data, oldRecord.data)) {
          const version = this.newRecordVersion(oldRecord, data);
          newVersions.push(version);
          updatedRecords.push(oldRecord);
        }

        continue;
      }

      const newRecord = await this.createRecord(
        {
          ...submission,
          _uuid: koboID,
        },
        data
      );
      newRecords.push(newRecord);
    }

    const recordsToSave = [...newRecords, ...updatedRecords];
    if (!recordsToSave.length) {
      return {
        added: 0,
        updated: 0,
      };
    }

    await Version.bulkSave(newVersions);
    await Record.bulkSave(recordsToSave);

    this.notifyChannel();

    return {
      added: newRecords.length,
      updated: updatedRecords.length,
    };
  }

  /** Notify the form channel that records have been synced from kobo */
  private async notifyChannel() {
    const channel = await Channel.findOne({ form: this.form._id });
    if (channel) {
      const notification = new Notification({
        action: `Records created from Kobo synchronized data submissions - ${this.form.name}`,
        content: '',
        channel: channel.id,
        seenBy: [],
      });
      await notification.save();
      const publisher = await pubsub();
      publisher.publish(channel.id, { notification });
    }
  }

  /**
   * Update the record passed with the new data.
   * Creates a new version of the record with the old data, adds it to the record and updates the record with the new data.
   *
   * @param record record to update
   * @param data new data to update
   * @returns version created
   */
  private newRecordVersion(record: Record, data: any) {
    const version = new Version({
      createdAt: record.modifiedAt ? record.modifiedAt : record.createdAt,
      data: record.data,
      createdBy: this.user?.id,
    });
    record.versions.push(version);
    record.markModified('versions');

    record.data = { ...record.data, ...data };
    record.markModified('data');

    record.modifiedAt = new Date();

    return version;
  }

  /**
   * Create a new record from a submission
   *
   * @param submission submission to create the record from
   * @param data data to create the record from
   */
  private async createRecord(
    submission: Omit<Submission, '_attachments'>,
    data: any
  ) {
    const koboId = submission['meta/rootUuid'] ?? submission._uuid;
    const { incrementalId, incID } = await getNextId(
      String(this.form.resource ? this.form.resource : this.form.id)
    );

    const record = new Record({
      incrementalId,
      incID,
      form: this.form.id,
      data,
      resource: this.form.resource ? this.form.resource : null,
      koboId,
      ...(this.user && {
        createdBy: {
          user: this.user._id,
          roles: this.user.roles.map((x) => x._id),
          positionAttributes: this.user.positionAttributes.map((x) => {
            return {
              value: x.value,
              category: x.category._id,
            };
          }),
        },
      }),
      lastUpdateForm: this.form.id,
      ...(this.user && {
        _createdBy: {
          user: {
            _id: this.user?._id,
            name: this.user?.name,
            username: this.user?.username,
          },
        },
      }),
      _form: {
        _id: this.form._id,
        name: this.form.name,
      },
      _lastUpdateForm: {
        _id: this.form._id,
        name: this.form.name,
      },
    });

    return record;
  }

  /** Configure user with ability */

  /** Fetch submissions using kobo api */
  private async fetchSubmissions() {
    const url = `https://kf.kobotoolbox.org/api/v2/assets/${this.form.kobo.id}/data.json`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `Token ${this.koboToken}`,
      },
    });

    let submissions = response?.data?.results || [];

    // Only data submissions sent when the form was in the same version as when it was imported will be used to create records
    if (this.form.kobo.dataFromDeployedVersion) {
      submissions = submissions.filter(
        (submission: any) =>
          submission.__version__ === this.form.kobo.deployedVersionId
      );
    }

    submissions.forEach((submission) => {
      this.attachments.push(...submission._attachments);
      delete submission._attachments;
    });

    // Bind any existing records to the submissions
    const existingRecords = await Record.find({
      form: this.form._id,
      koboId: { $ne: null },
    });

    existingRecords.forEach((record) => {
      const submission = submissions.find(
        (s) => s._uuid === record.koboId || s['meta/rootUuid'] === record.koboId
      );
      if (submission) {
        submission.record = record;
      }
    });

    this.submissions = submissions;
  }

  /**
   * Download a file from Kobo
   *
   * @param file file to download
   * @returns file content as a buffer
   */
  private async downloadKoboFile(file: string): Promise<Buffer> {
    const response = await axios.get(file, {
      headers: {
        Authorization: `Token ${this.koboToken}`,
      },
      responseType: 'arraybuffer',
    });
    return Buffer.from(response.data);
  }

  /**
   * Upload a buffer to Azure Blob Storage
   *
   * @param buffer buffer to upload
   * @returns path to the blob, or null if the upload failed for any reason
   */
  private async uploadBufferToBlobStorage(buffer: Buffer): Promise<string> {
    const filename = `${this.form._id.toString()}/${v4()}`;

    const blobServiceClient = BlobServiceClient.fromConnectionString(
      config.get('blobStorage.connectionString')
    );
    const containerClient = blobServiceClient.getContainerClient('forms');
    if (!(await containerClient.exists())) {
      await containerClient.create();
    }
    const blockBlobClient = containerClient.getBlockBlobClient(filename);
    await blockBlobClient.uploadData(buffer);

    return filename;
  }

  /**
   * Extracts the oort data payload for a given kobo entry
   *
   * @param submission kobo entry
   * @returns oort data payload
   */
  private async extractData(submission: Omit<Submission, '_attachments'>) {
    const complexQuestionsData = new Map<string, any>();
    const { booleanQuestions, matrixQuestions, rankingQuestions } =
      this.questionsByType;

    const tryParsingAsMatrix = async (key: string, koboValue: any) => {
      const matrixQuestion = matrixQuestions.find(
        (f) => f.type === 'matrixdropdown' && key.startsWith(f.name)
      );

      if (!matrixQuestion) {
        return null;
      }

      const { rows, columns, name: matrixQuestionName } = matrixQuestion;

      const rowName =
        matrixQuestion.kobo?.type === 'begin_score'
          ? // Rating questions have the format <matrixQuestionName>/<rowName>: <value>
            // But in oort, the save it as a matrix with a single column called 'rating'
            // And each row is <matrixQuestionName>/<rowName>, so we can use the key directly
            key
          : // Match the rest of the key, in the format <matrixQuestionName>_<rowName>/<matrixQuestionName>_<rowName>_<columnName>
            key.split('/')[0].slice(matrixQuestionName.length + 1);

      const row = (rows || []).find((r) => r.name === rowName);
      if (!row) {
        return null;
      }

      const columnName =
        matrixQuestion.kobo?.type === 'begin_score'
          ? 'rating'
          : key
              .split('/')[1]
              .slice(matrixQuestionName.length + rowName.length + 2);
      const column = (columns || []).find((c) => c.name === columnName);
      if (!column) {
        return null;
      }

      const matrixQuestionData = complexQuestionsData.get(matrixQuestionName);
      const oortValue = await this.mappedToOort(koboValue, column);

      if (matrixQuestionData) {
        set(matrixQuestionData, `${rowName}.${columnName}`, oortValue);
      } else {
        complexQuestionsData.set(matrixQuestionName, {
          [rowName]: {
            [columnName]: oortValue,
          },
        });
      }

      return complexQuestionsData.get(matrixQuestionName);
    };

    const processUnknownDataKey = async (key: string, value: any) => {
      // First we try parsing it as a dropdown matrix question
      const question = await tryParsingAsMatrix(key, value);
      if (question) {
        return;
      }

      // Then we check to see if it's a raking question
      const rankingQuestion = rankingQuestions.find(
        (f) => key.endsWith(f.name) && f.kobo?.type === 'rank__level'
      );

      if (rankingQuestion) {
        const valueInOort = await this.mappedToOort(value, rankingQuestion);
        complexQuestionsData.set(rankingQuestion.name, valueInOort);
      }
    };

    // The acknowledge question is mapped to a boolean question in oort,
    // so by default any records that have this field missing, will be set to false
    const boolQuestions = booleanQuestions.map((f) => f.name);
    const initData = boolQuestions.reduce((acc, key) => {
      acc[key] = false;
      return acc;
    }, {});

    // Filter submission object, keeping only questions data
    for (const key in { ...initData, ...submission }) {
      const field = this.form.fields.find((f) => f.name === key);
      if (!field) {
        const value = submission[key];
        await processUnknownDataKey(key, value);
        delete submission[key];
      } else {
        submission[key] = await this.mappedToOort(submission[key], field);
      }
    }

    for (const [key, value] of complexQuestionsData) {
      submission[key] = value;
    }

    return transformRecord(submission, this.form.fields);
  }

  /**
   * Maps kobo values to oort values
   *
   * @param koboValue kobo value
   * @param field field object from the form definition
   * @returns oort representation of the same value
   */
  private async mappedToOort(koboValue: unknown, field: Field) {
    const type = field.type;

    switch (type) {
      case 'file':
        if (typeof koboValue !== 'string') {
          return [];
        }

        const downloadUrl = this.attachments.find(
          (attachment) => attachment.question_xpath === field.name
        )?.download_url;

        if (!downloadUrl) {
          return [];
        }

        const buffer = await this.downloadKoboFile(downloadUrl);
        const path = await this.uploadBufferToBlobStorage(buffer);

        return [
          {
            name: koboValue,
            content: path,
            includeToken: false,
          },
        ];
      case 'dropdown':
        if (field.kobo?.type === 'rank__level') {
          return koboValue;
        }
        return koboValue;
      case 'checkbox':
      case 'tagbox':
        // Kobo stores checkboxes as "option1 option2 option3"
        // We need to store it as ["option1", "option2", "option3"]
        if (typeof koboValue !== 'string') {
          return [];
        }
        return koboValue.split(' ');
      case 'boolean':
        return Boolean(koboValue);
      case 'time':
        // Kobo stores time as 20:45:00.000-03:00
        // We need to store it as 1970-01-01T20:45:00.000Z
        if (typeof koboValue !== 'string') {
          return undefined;
        }

        const time = koboValue.slice(0, 12);
        return `1970-01-01T${time}Z`;
      case 'geospatial':
        const parseKoboCoordinates = (coordinates: string) => {
          if (!coordinates) {
            return [];
          }

          return coordinates.split(';').map((coord) => {
            const [lat, lon] = coord.split(' ');
            return [parseFloat(lon), parseFloat(lat)];
          });
        };
        const getGeoProperty = () => {
          if (typeof koboValue !== 'string') {
            return null;
          }
          const coordinates = parseKoboCoordinates(koboValue);

          switch (field.geometry) {
            case 'Point':
              return {
                type: 'Point',
                coordinates: coordinates[0],
              };
            case 'Polygon':
              return {
                type: 'Polygon',
                coordinates: [coordinates],
              };
            case 'PolyLine':
              return {
                type: 'LineString',
                coordinates,
              };
          }
        };

        return {
          type: 'Feature',
          geometry: getGeoProperty(),
          properties: {},
        };
      default:
        return koboValue;
    }
  }
}
