import { createMongoAbility } from '@casl/ability';
import { Application, Resource, Role } from '@models';
import duplicateApplication from '@schema/mutation/duplicateApplication.mutation';
import { Context } from '@server/apollo/context';
import { Types } from 'mongoose';
import { DatabaseHelpers } from '../../../helpers/database-helpers';

jest.mock('@services/logger.service');
jest.mock('@utils/files/copyFolder', () => ({
  copyFolder: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../../src/services/page.service', () => ({
  duplicatePages: jest.fn().mockResolvedValue([]),
}));

describe('duplicateApplication Resolver', () => {
  let databaseHelpers: DatabaseHelpers;
  let context: Context;
  let application: Application;
  let role: Role;
  let resource: Resource;
  let counter = 0;
  const otherRole = new Types.ObjectId();

  /** @returns the ids, as strings, sorted, of the given list */
  const ids = (list: any[]) => list.map((x) => String(x)).sort();

  beforeAll(async () => {
    databaseHelpers = new DatabaseHelpers();
    await databaseHelpers.connect();
  });

  afterAll(async () => {
    await databaseHelpers.disconnect();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    counter += 1;
    application = await Application.create({
      name: `Base application ${counter}`,
    });
    role = await Role.create({
      title: `Role ${counter}`,
      application: application._id,
    });
    resource = await Resource.create({
      name: `Resource ${counter}`,
      fields: [
        {
          name: 'name',
          type: 'text',
          permissions: { canSee: [role._id], canUpdate: [] },
        },
      ],
      permissions: {
        canSee: [role._id, otherRole],
        canUpdate: [],
        canSeeRecords: [{ role: role._id }, { role: otherRole }],
        canUploadRecords: [{ role: role._id }],
        fieldsAutoGrantCanSeeOptOut: [role._id],
        fieldsAutoGrantCanUpdateOptOut: [otherRole],
      },
    });
    context = {
      user: {
        _id: new Types.ObjectId(),
        ability: createMongoAbility([{ action: 'manage', subject: 'all' }]),
      },
      i18next: { t: jest.fn((key: string) => key) },
      timeZone: 'UTC',
    } as unknown as Context;
  });

  /**
   * Duplicate the base application and return the role created for the copy
   *
   * @returns duplicated role
   */
  const duplicate = async () => {
    const copy = await duplicateApplication.resolve(
      null,
      { application: application.id, name: `Copy ${counter}` },
      context
    );
    return Role.findOne({ application: copy._id });
  };

  it('should copy resource permissions to the duplicated role', async () => {
    const newRole = await duplicate();
    expect(newRole).toBeDefined();
    const updated = await Resource.findById(resource.id);
    expect(ids(updated.permissions.canSee)).toEqual(
      ids([role._id, otherRole, newRole._id])
    );
    expect(
      ids(updated.permissions.canSeeRecords.map((x: any) => x.role))
    ).toEqual(ids([role._id, otherRole, newRole._id]));
    expect(
      ids(updated.permissions.canUploadRecords.map((x: any) => x.role))
    ).toEqual(ids([role._id, newRole._id]));
  });

  it('should copy fields auto-grant opt-outs to the duplicated role', async () => {
    const newRole = await duplicate();
    const updated = await Resource.findById(resource.id);
    expect(ids(updated.permissions.fieldsAutoGrantCanSeeOptOut)).toEqual(
      ids([role._id, newRole._id])
    );
    // The other role does not belong to the application, so it is not remapped
    expect(ids(updated.permissions.fieldsAutoGrantCanUpdateOptOut)).toEqual(
      ids([otherRole])
    );
  });

  it('should copy fields permissions to the duplicated role', async () => {
    const newRole = await duplicate();
    const updated = await Resource.findById(resource.id);
    const name = updated.fields.find((f: any) => f.name === 'name');
    expect(ids(name.permissions.canSee)).toEqual(ids([role._id, newRole._id]));
  });
});
