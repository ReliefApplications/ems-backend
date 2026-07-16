import { Form, Record, Resource, User } from '@models';
import defineUserAbility from '@security/defineUserAbility';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { Types } from 'mongoose';
import { DatabaseHelpers } from '../../helpers/database-helpers';

/**
 * Build a user stub with a single role and its base ability.
 *
 * @param roleId Id of the user role
 * @param perms Global permission types of the role
 * @returns user stub
 */
const buildUser = (roleId: Types.ObjectId, perms: string[] = []): User => {
  const user = {
    _id: new Types.ObjectId(),
    roles: [
      {
        _id: roleId,
        permissions: perms.map((type) => ({ type, global: true })),
      },
    ],
  } as unknown as User;
  user.ability = defineUserAbility(user);
  return user;
};

/**
 * Create a resource and its form with the given record-level permissions.
 *
 * @param name Base name of the created documents
 * @param permissions Resource / form permissions
 * @param fields Resource / form fields (optional)
 * @returns created documents
 */
const createFormAndResource = async (
  name: string,
  permissions: any,
  fields: any[] = []
): Promise<{ form: Form; resource: Resource }> => {
  const resource = await Resource.create({
    name: `Resource - ${name}`,
    permissions,
    fields,
  });
  const form = await Form.create({
    name: `Form - ${name}`,
    graphQLTypeName: `Form${name.replace(/[^a-zA-Z]/g, '')}`,
    resource: resource._id,
    permissions: {
      ...permissions,
      // Unlike resources, forms store canCreateRecords as plain role ids
      canCreateRecords: permissions.canCreateRecords?.map(
        (x: any) => x.role ?? x
      ),
    },
    fields,
  });
  return { form, resource };
};

let databaseHelpers: DatabaseHelpers;

describe('extendAbilityForRecords', () => {
  beforeAll(async () => {
    databaseHelpers = new DatabaseHelpers();
    await databaseHelpers.connect();
  });

  afterAll(async () => {
    await databaseHelpers.disconnect();
  });

  it('should keep the ability of global record managers unchanged', async () => {
    const user = buildUser(new Types.ObjectId(), ['can_manage_forms']);
    const { form } = await createFormAndResource('manager', {});

    const ability = await extendAbilityForRecords(user, form);

    expect(ability).toBe(user.ability);
    expect(ability.can('manage', 'Record')).toBe(true);
  });

  it('should give read access to records of a form through canSeeRecords', async () => {
    const roleId = new Types.ObjectId();
    const user = buildUser(roleId);
    const { form, resource } = await createFormAndResource('see', {
      canSeeRecords: [{ role: roleId }],
    });

    const ability = await extendAbilityForRecords(user, form);

    expect(ability.can('read', new Record({ resource: resource._id }))).toBe(
      true
    );
    expect(
      ability.can('read', new Record({ resource: new Types.ObjectId() }))
    ).toBe(false);
    expect(ability.can('update', new Record({ resource: resource._id }))).toBe(
      false
    );
  });

  it('should hide archived records from users who cannot update the form', async () => {
    const roleId = new Types.ObjectId();
    const user = buildUser(roleId);
    const { form, resource } = await createFormAndResource('archived', {
      canSeeRecords: [{ role: roleId }],
    });

    const ability = await extendAbilityForRecords(user, form);

    expect(
      ability.can(
        'read',
        new Record({ resource: resource._id, archived: false })
      )
    ).toBe(true);
    expect(
      ability.can(
        'read',
        new Record({ resource: resource._id, archived: true })
      )
    ).toBe(false);
  });

  it('should only give access to fields listing one of the user roles', async () => {
    const roleId = new Types.ObjectId();
    const user = buildUser(roleId);
    const { form, resource } = await createFormAndResource(
      'fields',
      { canSeeRecords: [{ role: roleId }] },
      [
        {
          name: 'visible',
          type: 'text',
          permissions: { canSee: [roleId], canUpdate: [] },
        },
        {
          name: 'hidden',
          type: 'text',
          permissions: { canSee: [new Types.ObjectId()], canUpdate: [] },
        },
      ]
    );

    const ability = await extendAbilityForRecords(user, form);
    const record = new Record({ resource: resource._id });

    expect(ability.can('read', record, 'data.visible')).toBe(true);
    expect(ability.can('read', record, 'data.hidden')).toBe(false);
  });

  it('should give update access to records and writable fields through canUpdateRecords', async () => {
    const roleId = new Types.ObjectId();
    const user = buildUser(roleId);
    const { form, resource } = await createFormAndResource(
      'update',
      { canUpdateRecords: [{ role: roleId }] },
      [
        {
          name: 'editable',
          type: 'text',
          permissions: { canSee: [roleId], canUpdate: [roleId] },
        },
        {
          name: 'locked',
          type: 'text',
          readOnly: true,
          permissions: { canSee: [roleId], canUpdate: [roleId] },
        },
      ]
    );

    const ability = await extendAbilityForRecords(user, form);
    const record = new Record({ resource: resource._id });

    expect(ability.can('update', record)).toBe(true);
    expect(ability.can('update', record, 'data.editable')).toBe(true);
    // readOnly fields are never editable, even with the update permission
    expect(ability.can('update', record, 'data.locked')).toBe(false);
    expect(ability.can('read', record)).toBe(false);
  });

  it('should give create, download, upload and delete depending on the permissions', async () => {
    const roleId = new Types.ObjectId();
    const user = buildUser(roleId);
    const { form, resource } = await createFormAndResource('actions', {
      canCreateRecords: [{ role: roleId }],
      canDownloadRecords: [{ role: roleId }],
      canUploadRecords: [{ role: roleId }],
      canDeleteRecords: [{ role: roleId }],
    });

    const ability = await extendAbilityForRecords(user, form);
    const record = new Record({ form: form._id, resource: resource._id });

    expect(ability.can('create', record)).toBe(true);
    expect(ability.can('download', record)).toBe(true);
    expect(ability.can('upload', record)).toBe(true);
    expect(ability.can('delete', record)).toBe(true);
    expect(ability.can('create', new Record({ form: new Types.ObjectId() }))).toBe(
      false
    );
  });

  it('should not extend anything when the user roles have no permission', async () => {
    const user = buildUser(new Types.ObjectId());
    const { form, resource } = await createFormAndResource('none', {
      canSeeRecords: [{ role: new Types.ObjectId() }],
      canUpdateRecords: [{ role: new Types.ObjectId() }],
    });

    const ability = await extendAbilityForRecords(user, form);
    const record = new Record({ resource: resource._id });

    expect(ability.can('read', record)).toBe(false);
    expect(ability.can('update', record)).toBe(false);
    expect(ability.can('delete', record)).toBe(false);
  });

  it('should extend the ability for all the forms of a resource', async () => {
    const roleId = new Types.ObjectId();
    const user = buildUser(roleId);
    const { resource } = await createFormAndResource('resource', {
      canSeeRecords: [{ role: roleId }],
    });

    const ability = await extendAbilityForRecords(user, resource);

    expect(ability.can('read', new Record({ resource: resource._id }))).toBe(
      true
    );
  });

  it('should extend the ability on all forms when no object is given', async () => {
    const roleId = new Types.ObjectId();
    const user = buildUser(roleId);
    const { resource } = await createFormAndResource('all forms', {
      canSeeRecords: [{ role: roleId }],
    });

    const ability = await extendAbilityForRecords(user);

    expect(ability.can('read', new Record({ resource: resource._id }))).toBe(
      true
    );
  });

  it('should throw for an unexpected object type', async () => {
    const user = buildUser(new Types.ObjectId());

    await expect(
      extendAbilityForRecords(user, { name: 'not a model' } as any)
    ).rejects.toThrow('Unexpected type');
  });
});
