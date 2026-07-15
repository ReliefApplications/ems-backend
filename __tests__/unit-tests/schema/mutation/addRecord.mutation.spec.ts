import { Form, Record } from '@models';
import addRecord, {
  AddRecordArgs,
} from '@schema/mutation/addRecord.mutation';
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
  let nextIdCounter = 0;

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
