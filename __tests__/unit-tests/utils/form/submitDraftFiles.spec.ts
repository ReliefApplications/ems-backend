import { Form } from '@models';
import { createDraftFilesCache, submitDraftFiles } from '@utils/form';
import { Types } from 'mongoose';
import { GraphQLError } from 'graphql';
import { DatabaseHelpers } from '../../../helpers/database-helpers';
import { Context } from '@server/apollo/context';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { logger } from '@services/logger.service';
import { uploadDocument } from '@utils/commonServices/uploadDocument';
import { downloadFileBuffer } from '@utils/files/downloadFile';

jest.mock('@services/logger.service');

// Mock the extendAbilityForRecords function
jest.mock('@security/extendAbilityForRecords', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock the storages of the files
jest.mock('@utils/commonServices/uploadDocument', () => ({
  uploadDocument: jest.fn(),
}));
jest.mock('@utils/files/downloadFile', () => ({
  downloadFileBuffer: jest.fn(),
}));

// getNextId relies on Redis
jest.mock('@utils/form/getNextId', () => ({
  getNextId: jest.fn(),
}));

describe('submitDraftFiles', () => {
  let context: Context;
  let databaseHelpers: DatabaseHelpers;
  let form: Form;
  const upload = { driveId: 'drive', body: { DocumentType: [2] } };
  const stored = { driveId: 'drive', itemId: 'stored' };
  const fields = [
    { name: 'files', type: 'file' },
    { name: 'copies', type: 'file' },
    { name: 'title', type: 'text' },
  ];

  /**
   * Builds a draft file of the form.
   *
   * @param name Name of the file
   * @param overrides Properties overriding the default ones
   * @returns Draft file, to upload to document management
   */
  const draftFile = (name: string, overrides: any = {}) => ({
    name,
    content: `${form.id}/${name}`,
    draft: true,
    upload,
    ...overrides,
  });

  beforeAll(async () => {
    databaseHelpers = new DatabaseHelpers();
    await databaseHelpers.connect();
    form = await Form.create({
      name: 'Draft files form',
      graphQLTypeName: 'DraftFilesForm',
      fields,
    });
  });

  afterAll(async () => {
    await databaseHelpers.disconnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    context = {
      user: { _id: new Types.ObjectId(), roles: [], positionAttributes: [] },
      accesstoken: 'user-access-token',
      i18next: { t: jest.fn((key: string) => key) },
      timeZone: 'UTC',
    } as unknown as Context;
    (extendAbilityForRecords as jest.Mock).mockResolvedValue({
      can: jest.fn().mockReturnValue(true),
    });
    (downloadFileBuffer as jest.Mock).mockResolvedValue(Buffer.from('content'));
    (uploadDocument as jest.Mock).mockImplementation(async (file) => ({
      driveId: 'drive',
      itemId: `item-${file.name}`,
    }));
  });

  it('should upload the draft files to document management, as the user', async () => {
    const data = {
      title: 'record',
      files: [
        draftFile('a.pdf', { lang: 'en' }),
        { name: 'stored.pdf', content: stored },
      ],
    };

    const editedFields = await submitDraftFiles(data, fields, context);

    expect(editedFields).toEqual(['files']);
    expect(downloadFileBuffer).toHaveBeenCalledWith(
      'forms',
      `${form.id}/a.pdf`
    );
    expect(uploadDocument).toHaveBeenCalledTimes(1);
    expect(uploadDocument).toHaveBeenCalledWith(
      { name: 'a.pdf', data: Buffer.from('content') },
      upload,
      'user-access-token'
    );
    expect(data).toEqual({
      title: 'record',
      files: [
        {
          name: 'a.pdf',
          content: { driveId: 'drive', itemId: 'item-a.pdf' },
          lang: 'en',
        },
        { name: 'stored.pdf', content: stored },
      ],
    });
  });

  it('should keep the draft files without upload in the back-end storage', async () => {
    const data = {
      files: [{ name: 'a.pdf', content: `${form.id}/a.pdf`, draft: true }],
    };

    await submitDraftFiles(data, fields, context);

    expect(data.files).toEqual([
      { name: 'a.pdf', content: `${form.id}/a.pdf` },
    ]);
    expect(uploadDocument).not.toHaveBeenCalled();
  });

  it('should only read the file questions holding draft files', async () => {
    const data = {
      title: [draftFile('not-a-file.pdf')],
      files: [{ name: 'stored.pdf', content: stored }],
      copies: null,
    };
    const untouched = JSON.parse(JSON.stringify(data));

    expect(await submitDraftFiles(data, fields, context)).toEqual([]);
    expect(data).toEqual(untouched);
    expect(uploadDocument).not.toHaveBeenCalled();
  });

  it('should upload a file shared by several questions or records once', async () => {
    const cache = createDraftFilesCache();
    const data = { files: [draftFile('a.pdf')], copies: [draftFile('a.pdf')] };
    const otherData = { files: [draftFile('a.pdf')] };

    await submitDraftFiles(data, fields, context, cache);
    await submitDraftFiles(otherData, fields, context, cache);

    expect(uploadDocument).toHaveBeenCalledTimes(1);
    const content = { driveId: 'drive', itemId: 'item-a.pdf' };
    expect(data.copies).toEqual([{ name: 'a.pdf', content }]);
    expect(otherData.files).toEqual([{ name: 'a.pdf', content }]);
  });

  describe('Files which cannot be uploaded', () => {
    /**
     * Expects the submission of a draft file to fail, the file being left as
     * it is.
     *
     * @param file Draft file
     */
    const expectFailure = async (file: any) => {
      const data = { files: [file] };
      const result = submitDraftFiles(data, fields, context);
      await expect(result).rejects.toThrow(GraphQLError);
      await expect(result).rejects.toThrow(
        `utils.files.uploadFile.errors.fileCannotBeUploaded ( ${file.name} )`
      );
      expect(data.files).toEqual([file]);
      expect(logger.error).toHaveBeenCalled();
    };

    it('should fail when document management refuses the file', async () => {
      (uploadDocument as jest.Mock).mockRejectedValue(new Error('Refused'));
      await expectFailure(draftFile('a.pdf'));
    });

    it('should fail when the file is not in the back-end storage', async () => {
      (downloadFileBuffer as jest.Mock).mockRejectedValue(new Error('Missing'));
      await expectFailure(draftFile('a.pdf'));
      expect(uploadDocument).not.toHaveBeenCalled();
    });

    it('should fail without the access token of the user', async () => {
      context = { ...context, accesstoken: undefined } as Context;
      await expectFailure(draftFile('a.pdf'));
      expect(downloadFileBuffer).not.toHaveBeenCalled();
    });

    it('should fail without a drive to upload the file to', async () => {
      await expectFailure(draftFile('a.pdf', { upload: { body: {} } }));
      expect(downloadFileBuffer).not.toHaveBeenCalled();
    });

    it('should not read a file outside the files of the forms', async () => {
      await expectFailure(draftFile('a.pdf', { content: '../secrets/a.pdf' }));
      await expectFailure(
        draftFile('a.pdf', { content: `${form.id}/folder/a.pdf` })
      );
      expect(downloadFileBuffer).not.toHaveBeenCalled();
    });

    it('should not read the files of a form the user cannot read', async () => {
      (extendAbilityForRecords as jest.Mock).mockResolvedValue({
        can: jest.fn().mockReturnValue(false),
      });
      await expectFailure(draftFile('a.pdf'));
      await expectFailure(
        draftFile('a.pdf', { content: `${new Types.ObjectId()}/a.pdf` })
      );
      expect(downloadFileBuffer).not.toHaveBeenCalled();
    });
  });
});
