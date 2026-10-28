import express from 'express';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { Types } from 'mongoose';
import { downloadFile, listFolderFiles } from '@utils/files';
import { sendEmail } from '@utils/email';
import email from '@routes/email';

jest.mock('@services/logger.service');
jest.mock('@utils/files');
jest.mock('@utils/files/xlsBuilder');
jest.mock('@utils/email', () => ({
  preprocess: jest.fn((value: string) => value),
  sendEmail: jest.fn(),
  senderAddress: 'noreply@who.int',
}));
jest.mock('i18next', () => ({
  t: jest.fn((key: string) => key),
}));

/** Attachments root, as resolved by the route */
const ROOT = path.resolve('files');
/** Folder id returned by POST /email/files */
const FOLDER_ID = '0b0d1c1e-7f4d-4a6e-9d3e-3e3f1d9a2b11';

/**
 * Mount the email router behind a middleware injecting the logged user.
 *
 * @returns express app
 */
const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.context = { user: { _id: new Types.ObjectId() } };
    req.t = (key: string) => key;
    next();
  });
  app.use('/email', email);
  return app;
};

/**
 * Checks that a path is strictly inside the attachments root.
 *
 * @param value path to check
 * @returns true when inside the root
 */
const insideRoot = (value: string) => value.startsWith(ROOT + path.sep);

describe('POST /email - attachments folder (H-08 path traversal)', () => {
  const fsCalls: { readdir: string[]; readFile: string[]; rm: string[] } = {
    readdir: [],
    readFile: [],
    rm: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    fsCalls.readdir = [];
    fsCalls.readFile = [];
    fsCalls.rm = [];
    (listFolderFiles as jest.Mock).mockResolvedValue([
      { name: `${FOLDER_ID}/report.pdf` },
    ]);
    (downloadFile as jest.Mock).mockResolvedValue(undefined);
    (sendEmail as jest.Mock).mockResolvedValue(undefined);
    jest.spyOn(fs, 'readdir').mockImplementation(((dir: string, cb: any) => {
      fsCalls.readdir.push(dir);
      cb(null, ['report.pdf']);
    }) as any);
    jest.spyOn(fs, 'readFile').mockImplementation(((file: string, cb: any) => {
      fsCalls.readFile.push(file);
      cb(null, Buffer.from('pdf'));
    }) as any);
    jest.spyOn(fs, 'rm').mockImplementation(((
      target: string,
      _options: any,
      cb: any
    ) => {
      fsCalls.rm.push(target);
      cb(null);
    }) as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reads and deletes only the folder of the given id', async () => {
    const res = await request(buildApp())
      .post('/email')
      .send({
        recipient: 'a@who.int',
        subject: 'Hi',
        body: 'Hello',
        files: FOLDER_ID,
      });
    expect(res.status).toBe(200);
    expect(listFolderFiles).toHaveBeenCalledWith('temp', FOLDER_ID);
    expect(downloadFile).toHaveBeenCalledWith(
      'temp',
      `${FOLDER_ID}/report.pdf`,
      path.join(ROOT, FOLDER_ID, 'report.pdf')
    );
    expect(fsCalls.readdir).toEqual([path.join(ROOT, FOLDER_ID)]);
    expect(fsCalls.readFile).toEqual([
      path.join(ROOT, FOLDER_ID, 'report.pdf'),
    ]);
    expect(fsCalls.rm).toEqual([path.join(ROOT, FOLDER_ID)]);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.objectContaining({
          attachments: [
            { filename: 'report.pdf', content: Buffer.from('pdf') },
          ],
        }),
      })
    );
  });

  it.each([
    ['../../etc', 'relative traversal'],
    ['..\\..\\windows', 'backslash traversal'],
    ['/etc/passwd', 'absolute path'],
    [`${FOLDER_ID}/../../..`, 'traversal after a valid id'],
    ['....//....//tmp', 'nested dots'],
  ])(
    'never touches a path outside the attachments folder for %s (%s)',
    async (files) => {
      const res = await request(buildApp())
        .post('/email')
        .send({ recipient: 'a@who.int', subject: 'Hi', body: 'Hello', files });
      expect([200, 400]).toContain(res.status);
      for (const target of [
        ...fsCalls.readdir,
        ...fsCalls.readFile,
        ...fsCalls.rm,
      ]) {
        expect(insideRoot(target)).toBe(true);
        expect(target).not.toContain('..');
      }
      for (const call of (downloadFile as jest.Mock).mock.calls) {
        expect(insideRoot(call[2])).toBe(true);
      }
    }
  );

  it.each([['..'], ['.'], ['/'], ['\\'], [''], [{ id: FOLDER_ID }], [['x']]])(
    'rejects a folder value that resolves to nothing (%p)',
    async (files) => {
      const res = await request(buildApp())
        .post('/email')
        .send({ recipient: 'a@who.int', subject: 'Hi', body: 'Hello', files });
      if (files === '') {
        // Falsy value: no attachments requested, the email is simply sent without files
        expect(res.status).toBe(200);
      } else {
        expect(res.status).toBe(400);
        expect(res.text).toBe('routes.email.errors.invalidAttachmentsFolder');
        expect(sendEmail).not.toHaveBeenCalled();
      }
      expect(fsCalls.rm).toEqual([]);
      expect(fsCalls.readdir).toEqual([]);
    }
  );

  it('skips blobs whose name would escape the folder', async () => {
    (listFolderFiles as jest.Mock).mockResolvedValue([
      { name: `${FOLDER_ID}/../../escape.txt` },
      { name: `${FOLDER_ID}/ok.txt` },
    ]);
    await request(buildApp())
      .post('/email')
      .send({
        recipient: 'a@who.int',
        subject: 'Hi',
        body: 'Hello',
        files: FOLDER_ID,
      });
    for (const call of (downloadFile as jest.Mock).mock.calls) {
      expect(insideRoot(call[2])).toBe(true);
      expect(call[2]).not.toContain('..');
    }
  });
});
