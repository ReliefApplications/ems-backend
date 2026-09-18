import { Form, Record, Version } from '@models';
import addRecord, { AddRecordArgs } from '@schema/mutation/addRecord.mutation';
import { Types } from 'mongoose';
import { DatabaseHelpers } from '../../../helpers/database-helpers';
import { GraphQLError } from 'graphql';
import { Context } from '@server/apollo/context';
import { logger } from '@services/logger.service';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { verifyTurnstileToken } from '@utils/captcha';
import { getNextId } from '@utils/form';

jest.mock('@services/logger.service');

// Mock the extendAbilityForRecords function
jest.mock('@security/extendAbilityForRecords', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock the captcha verification, so no call is made to Cloudflare
jest.mock('@utils/captcha', () => ({
  __esModule: true,
  verifyTurnstileToken: jest.fn(),
}));

// Mock getNextId only, as it relies on Redis
jest.mock('@utils/form', () => ({
  ...jest.requireActual('@utils/form'),
  getNextId: jest.fn(),
}));

describe('addRecord Resolver', () => {
  let context: Context;
  let args: AddRecordArgs;
  let databaseHelpers: DatabaseHelpers;
  let publicForm: Form;
  let privateForm: Form;
  let resourceForm: Form;
  let otherResourceForm: Form;
  let nextIdCounter = 0;
  const resource = new Types.ObjectId();
  const otherResource = new Types.ObjectId();

  beforeAll(async () => {
    databaseHelpers = new DatabaseHelpers();
    await databaseHelpers.connect();
    publicForm = await Form.create({
      name: 'Public form',
      graphQLTypeName: 'PublicForm',
      isPublic: true,
      fields: [{ name: 'description', type: 'text' }],
    });
    privateForm = await Form.create({
      name: 'Private form',
      graphQLTypeName: 'PrivateForm',
      fields: [{ name: 'description', type: 'text' }],
    });
    resourceForm = await Form.create({
      name: 'Resource form',
      graphQLTypeName: 'ResourceForm',
      resource,
      fields: [{ name: 'description', type: 'text' }],
    });
    otherResourceForm = await Form.create({
      name: 'Other resource form',
      graphQLTypeName: 'OtherResourceForm',
      resource: otherResource,
      fields: [{ name: 'description', type: 'text' }],
    });
  });

  afterAll(async () => {
    await databaseHelpers.disconnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    context = {
      user: {
        _id: new Types.ObjectId(),
        name: 'Test User',
        username: 'test@user.com',
        roles: [{ _id: new Types.ObjectId() }],
        positionAttributes: [],
        ability: { can: jest.fn().mockReturnValue(true) },
      },
      i18next: { t: jest.fn((key: string) => key) },
      timeZone: 'UTC',
    } as unknown as Context;

    args = {
      form: privateForm.id,
      data: { description: 'test record' },
    };

    (extendAbilityForRecords as jest.Mock).mockResolvedValue({
      can: jest.fn().mockReturnValue(true),
      cannot: jest.fn().mockReturnValue(false),
    });
    (verifyTurnstileToken as jest.Mock).mockResolvedValue(true);
    // Records have a unique index on incrementalId, so each call must
    // return a different id, as the real implementation does
    (getNextId as jest.Mock).mockImplementation(async () => {
      nextIdCounter += 1;
      return `2026-P${String(nextIdCounter).padStart(8, '0')}`;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Authenticated user', () => {
    it('should create a record if the user has permission', async () => {
      const record = await addRecord.resolve(null, args, context);
      expect(record).toBeInstanceOf(Record);
      expect(record.createdBy.user).toEqual(context.user._id);
      expect(record._createdBy.user.username).toEqual('test@user.com');
      expect(record.incrementalId).toMatch(/^2026-P\d{8}$/);
      expect(record.data.description).toEqual('test record');
    });

    it('should not require a captcha token', async () => {
      await addRecord.resolve(null, args, context);
      expect(verifyTurnstileToken).not.toHaveBeenCalled();
    });

    it('should throw an error if the user does not have permission', async () => {
      (extendAbilityForRecords as jest.Mock).mockResolvedValue({
        can: jest.fn().mockReturnValue(false),
        cannot: jest.fn().mockReturnValue(true),
      });
      const result = addRecord.resolve(null, args, context);
      await expect(result).rejects.toThrow(GraphQLError);
      expect(context.i18next.t).toHaveBeenCalledWith(
        'common.errors.permissionNotGranted'
      );
    });

    it('should throw an error if the form is not found', async () => {
      args.form = new Types.ObjectId().toHexString();
      const result = addRecord.resolve(null, args, context);
      await expect(result).rejects.toThrow(GraphQLError);
      expect(context.i18next.t).toHaveBeenCalledWith(
        'common.errors.dataNotFound'
      );
    });
  });

  describe('Cloning a record', () => {
    let clonedRecord: Record;
    let clonedVersions: Version[];

    /**
     * Create a record with two versions, to clone from.
     *
     * @param form form of the record
     * @returns the created record
     */
    const createRecordWithHistory = async (form: Form) => {
      clonedVersions = await Version.create([
        { data: { description: 'v1' }, createdBy: new Types.ObjectId() },
        { data: { description: 'v2' }, createdBy: new Types.ObjectId() },
      ]);
      return Record.create({
        incrementalId: `2026-C${String(++nextIdCounter).padStart(8, '0')}`,
        form: form._id,
        _form: { _id: form._id, name: form.name },
        resource: form.resource,
        data: { description: 'cloned record' },
        versions: clonedVersions.map((x) => x._id),
      });
    };

    beforeEach(async () => {
      clonedRecord = await createRecordWithHistory(resourceForm);
      args = {
        form: resourceForm.id,
        data: { description: 'clone' },
        cloneRecordId: clonedRecord.id,
      };
    });

    it('should copy the history of the cloned record, plus its current data', async () => {
      const record = await addRecord.resolve(null, args, context);
      expect(record.versions).toHaveLength(clonedVersions.length + 1);

      const versions = await Promise.all(
        record.versions.map((id: any) => Version.findById(id))
      );
      expect(versions.map((x) => x.data.description)).toEqual([
        'v1',
        'v2',
        'cloned record',
      ]);
    });

    it('should reuse the versions of the cloned record, without duplicating them', async () => {
      const versionsBefore = await Version.countDocuments();
      const record = await addRecord.resolve(null, args, context);
      clonedVersions.forEach((version, index) => {
        expect(version._id.equals(record.versions[index])).toBe(true);
      });
      // Only the version storing the data of the cloned record is created
      expect(await Version.countDocuments()).toEqual(versionsBefore + 1);
      // The cloned record keeps its own versions
      const source = await Record.findById(clonedRecord._id);
      expect(source.versions).toHaveLength(clonedVersions.length);
    });

    it('should keep the shared versions when one of the records is deleted', async () => {
      const record = await addRecord.resolve(null, args, context);
      await Record.deleteOne({ _id: record._id });
      // Versions still used by the cloned record are kept
      for (const version of clonedVersions) {
        expect(await Version.exists({ _id: version._id })).toBeTruthy();
      }
      // The version only used by the deleted record is removed
      const ownVersion = record.versions[record.versions.length - 1];
      expect(await Version.exists({ _id: ownVersion })).toBeNull();

      // Once no record uses them anymore, shared versions are removed
      await Record.deleteOne({ _id: clonedRecord._id });
      for (const version of clonedVersions) {
        expect(await Version.exists({ _id: version._id })).toBeNull();
      }
    });

    it('should clone a record of a form without resource', async () => {
      const recordToClone = await createRecordWithHistory(privateForm);
      args = {
        form: privateForm.id,
        data: { description: 'clone' },
        cloneRecordId: recordToClone.id,
      };
      const record = await addRecord.resolve(null, args, context);
      expect(record.versions).toHaveLength(clonedVersions.length + 1);
    });

    it('should throw an error if the id is not a valid record id', async () => {
      args.cloneRecordId = 'not-an-id';
      const result = addRecord.resolve(null, args, context);
      await expect(result).rejects.toThrow(GraphQLError);
      expect(context.i18next.t).toHaveBeenCalledWith(
        'mutations.record.add.errors.invalidCloneRecordId'
      );
    });

    it('should throw an error if the record does not exist', async () => {
      args.cloneRecordId = new Types.ObjectId().toHexString();
      const result = addRecord.resolve(null, args, context);
      await expect(result).rejects.toThrow(GraphQLError);
      expect(context.i18next.t).toHaveBeenCalledWith(
        'mutations.record.add.errors.invalidCloneRecordResource'
      );
    });

    it('should throw an error if the record belongs to another resource', async () => {
      const recordToClone = await createRecordWithHistory(otherResourceForm);
      args.cloneRecordId = recordToClone.id;
      const result = addRecord.resolve(null, args, context);
      await expect(result).rejects.toThrow(GraphQLError);
      expect(context.i18next.t).toHaveBeenCalledWith(
        'mutations.record.add.errors.invalidCloneRecordResource'
      );
    });

    it('should throw an error if the user cannot read the cloned record', async () => {
      (extendAbilityForRecords as jest.Mock)
        // Creation of the new record is allowed
        .mockResolvedValueOnce({
          can: jest.fn().mockReturnValue(true),
          cannot: jest.fn().mockReturnValue(false),
        })
        // But the cloned record cannot be read
        .mockResolvedValueOnce({
          can: jest.fn().mockReturnValue(false),
          cannot: jest.fn().mockReturnValue(true),
        });
      const result = addRecord.resolve(null, args, context);
      await expect(result).rejects.toThrow(GraphQLError);
      expect(context.i18next.t).toHaveBeenCalledWith(
        'common.errors.permissionNotGranted'
      );
    });

    it('should throw an error if the user is not logged', async () => {
      context = { ...context, user: null } as unknown as Context;
      args.form = publicForm.id;
      args.captchaToken = 'captcha-token';
      const result = addRecord.resolve(null, args, context);
      await expect(result).rejects.toThrow(GraphQLError);
      expect(context.i18next.t).toHaveBeenCalledWith(
        'common.errors.userNotLogged'
      );
    });

    it('should not create any version if the record cannot be saved', async () => {
      jest
        .spyOn(Record.prototype, 'save')
        .mockRejectedValue(new Error('unexpected error'));
      const versionsBefore = await Version.countDocuments();
      const result = addRecord.resolve(null, args, context);
      await expect(result).rejects.toThrow(GraphQLError);
      expect(await Version.countDocuments()).toEqual(versionsBefore);
    });
  });

  describe('Unauthenticated user', () => {
    beforeEach(() => {
      context = { ...context, user: null } as unknown as Context;
      args = {
        form: publicForm.id,
        data: { description: 'public record' },
        captchaToken: 'captcha-token',
      };
    });

    it('should throw an error if the form is not public', async () => {
      args.form = privateForm.id;
      const result = addRecord.resolve(null, args, context);
      await expect(result).rejects.toThrow(GraphQLError);
      expect(context.i18next.t).toHaveBeenCalledWith(
        'common.errors.userNotLogged'
      );
      expect(verifyTurnstileToken).not.toHaveBeenCalled();
    });

    it('should throw an error if no captcha token is provided', async () => {
      args.captchaToken = undefined;
      const result = addRecord.resolve(null, args, context);
      await expect(result).rejects.toThrow(GraphQLError);
      expect(context.i18next.t).toHaveBeenCalledWith(
        'common.errors.invalidCaptcha'
      );
      expect(verifyTurnstileToken).not.toHaveBeenCalled();
    });

    it('should throw an error if the captcha token is invalid', async () => {
      (verifyTurnstileToken as jest.Mock).mockResolvedValue(false);
      const result = addRecord.resolve(null, args, context);
      await expect(result).rejects.toThrow(GraphQLError);
      expect(verifyTurnstileToken).toHaveBeenCalledWith('captcha-token');
      expect(context.i18next.t).toHaveBeenCalledWith(
        'common.errors.invalidCaptcha'
      );
    });

    it('should create a record on a public form with a valid captcha token', async () => {
      const record = await addRecord.resolve(null, args, context);
      expect(record).toBeInstanceOf(Record);
      expect(verifyTurnstileToken).toHaveBeenCalledWith('captcha-token');
      expect(record.createdBy?.user).toBeUndefined();
      expect(record._createdBy?.user).toBeUndefined();
      expect(record.data.description).toEqual('public record');
    });

    it('should skip the ability check', async () => {
      await addRecord.resolve(null, args, context);
      expect(extendAbilityForRecords).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should log the error and throw GraphQLError on unexpected errors', async () => {
      jest
        .spyOn(Record.prototype, 'save')
        .mockRejectedValue(new Error('unexpected error'));
      const result = addRecord.resolve(null, args, context);
      await expect(result).rejects.toThrow(GraphQLError);
      expect(logger.error).toHaveBeenCalled();
      expect(context.i18next.t).toHaveBeenCalledWith(
        'common.errors.internalServerError'
      );
    });
  });
});
