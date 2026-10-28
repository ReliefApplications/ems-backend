import express from 'express';
import request from 'supertest';
import { Types } from 'mongoose';
import { AbilityBuilder, Ability } from '@casl/ability';
import { User } from '@models';
import { fileBuilder } from '@utils/files';
import permissions from '@const/permissions';
import download from '@routes/download';

jest.mock('@models');
jest.mock('@utils/files');
jest.mock('@utils/files/resourceExporter');
jest.mock('@server/apollo/dataSources');
jest.mock('@services/logger.service');
jest.mock('i18next', () => ({
  t: jest.fn((key: string) => key),
}));

/** Application used by the application export tests */
const APP_ID = new Types.ObjectId().toHexString();
/** Another application, to check that app permissions do not leak */
const OTHER_APP_ID = new Types.ObjectId().toHexString();

/**
 * Build a CASL ability from a list of (action, subject) tuples.
 *
 * @param rules rules granted to the user
 * @returns ability
 */
const buildAbility = (rules: [string | string[], string][]) => {
  // eslint-disable-next-line deprecation/deprecation
  const builder = new AbilityBuilder(Ability);
  rules.forEach(([action, subject]) => builder.can(action, subject));
  return builder.build();
};

/**
 * Build a back-office role, optionally attached to an application.
 *
 * @param applicationId application id, when the role belongs to an application
 * @param permissionTypes permission types of the role
 * @returns role-like object as populated on context.user
 */
const buildRole = (
  applicationId: string | null,
  permissionTypes: string[]
) => ({
  _id: new Types.ObjectId(),
  application: applicationId ? new Types.ObjectId(applicationId) : null,
  permissions: permissionTypes.map((type) => ({ type })),
});

/**
 * Mount the download router behind a middleware injecting the logged user.
 *
 * @param user user to inject in the request context
 * @returns express app
 */
const buildApp = (user: any) => {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.context = { user };
    req.t = (key: string) => key;
    next();
  });
  app.use('/download', download);
  return app;
};

/** Regular user: can read users (needed by user pickers) but has no user management permission */
const regularUser = {
  _id: new Types.ObjectId(),
  roles: [buildRole(null, [])],
  ability: buildAbility([['read', 'User']]),
};

/** Back-office user manager: global can_see_users permission */
const userManager = {
  _id: new Types.ObjectId(),
  roles: [buildRole(null, [permissions.canSeeUsers])],
  ability: buildAbility([
    [['create', 'read', 'update', 'delete', 'manage'], 'User'],
  ]),
};

/** Application user manager: can_see_users on a role of APP_ID only */
const appUserManager = {
  _id: new Types.ObjectId(),
  roles: [buildRole(APP_ID, [permissions.canSeeUsers])],
  ability: buildAbility([['read', 'User']]),
};

describe('Download routes - user exports (H-04)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (User.find as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue([]),
    });
    (User.aggregate as jest.Mock).mockResolvedValue([]);
    (fileBuilder as jest.Mock).mockImplementation(async (res) =>
      res.status(200).send('file')
    );
  });

  describe('POST /download/users (back-office)', () => {
    it('refuses users without the global can_see_users permission', async () => {
      const res = await request(buildApp(regularUser))
        .post('/download/users')
        .send({});
      expect(res.status).toBe(403);
      expect(res.text).toBe('common.errors.permissionNotGranted');
      expect(User.find).not.toHaveBeenCalled();
      expect(fileBuilder).not.toHaveBeenCalled();
    });

    it('refuses application user managers (app permission is not a back-office permission)', async () => {
      const res = await request(buildApp(appUserManager))
        .post('/download/users')
        .send({});
      expect(res.status).toBe(403);
      expect(User.find).not.toHaveBeenCalled();
    });

    it('exports users for back-office user managers', async () => {
      const res = await request(buildApp(userManager))
        .post('/download/users?type=xlsx')
        .send({});
      expect(res.status).toBe(200);
      expect(User.find).toHaveBeenCalledTimes(1);
      expect(fileBuilder).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /download/application/:id/users (front-office)', () => {
    it('refuses users without any can_see_users permission', async () => {
      const res = await request(buildApp(regularUser))
        .post(`/download/application/${APP_ID}/users`)
        .send({});
      expect(res.status).toBe(403);
      expect(res.text).toBe('common.errors.permissionNotGranted');
      expect(User.aggregate).not.toHaveBeenCalled();
    });

    it('exports users of the application for users who can see its users page', async () => {
      const res = await request(buildApp(appUserManager))
        .post(`/download/application/${APP_ID}/users?type=xlsx`)
        .send({});
      expect(res.status).toBe(200);
      expect(User.aggregate).toHaveBeenCalledTimes(1);
      expect(fileBuilder).toHaveBeenCalledTimes(1);
    });

    it('refuses the export of another application', async () => {
      const res = await request(buildApp(appUserManager))
        .post(`/download/application/${OTHER_APP_ID}/users`)
        .send({});
      expect(res.status).toBe(403);
      expect(User.aggregate).not.toHaveBeenCalled();
    });

    it('exports users of any application for back-office user managers', async () => {
      const res = await request(buildApp(userManager))
        .post(`/download/application/${OTHER_APP_ID}/users?type=xlsx`)
        .send({});
      expect(res.status).toBe(200);
      expect(User.aggregate).toHaveBeenCalledTimes(1);
    });
  });
});
