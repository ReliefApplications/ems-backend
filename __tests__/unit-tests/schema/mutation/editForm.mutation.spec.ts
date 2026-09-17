import { Form, Resource } from '@models';
import editForm from '@schema/mutation/editForm.mutation';
import { Context } from '@server/apollo/context';
import { Types } from 'mongoose';
import { DatabaseHelpers } from '../../../helpers/database-helpers';

jest.mock('@services/logger.service');

describe('editForm Resolver', () => {
  let databaseHelpers: DatabaseHelpers;
  let context: Context;
  let resource: Resource;
  let form: Form;
  let counter = 0;
  const roleA = new Types.ObjectId(); // resource-level access only
  const roleB = new Types.ObjectId(); // sees records
  const roleC = new Types.ObjectId(); // sees records, opted out
  const roleD = new Types.ObjectId(); // creates records

  /**
   * Build a form structure with the given text questions
   *
   * @param names question names
   * @returns stringified structure
   */
  const structureWith = (names: string[]) =>
    JSON.stringify({
      pages: [
        {
          name: 'page1',
          elements: names.map((name) => ({
            type: 'text',
            name,
            valueName: name,
          })),
        },
      ],
    });

  /** @returns structure with one data question and a Field history question */
  const structureWithFieldHistory = () =>
    JSON.stringify({
      pages: [
        {
          name: 'page1',
          elements: [
            {
              type: 'text',
              name: 'name',
              valueName: 'name',
            },
            {
              type: 'field-history',
              name: 'name_history',
              field: 'question:name',
              title: 'Name history',
            },
          ],
        },
      ],
    });

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
    resource = await Resource.create({
      name: `Resource ${counter}`,
      fields: [
        {
          name: 'name',
          type: 'text',
          isCore: true,
          permissions: { canSee: [roleA], canUpdate: [roleA] },
        },
      ],
      permissions: {
        canSee: [roleA],
        canUpdate: [roleA],
        canSeeRecords: [{ role: roleB }, { role: roleC }],
        canCreateRecords: [{ role: roleD }],
        canUpdateRecords: [],
        fieldsAutoGrantCanSeeOptOut: [roleC],
        fieldsAutoGrantCanUpdateOptOut: [],
      },
    });
    form = await Form.create({
      name: `Form ${counter}`,
      graphQLTypeName: `Form${counter}`,
      core: true,
      resource: resource._id,
      structure: structureWith(['name']),
      fields: [{ name: 'name', type: 'text', isCore: true }],
    });
    context = {
      user: {
        _id: new Types.ObjectId(),
        ability: {
          can: jest.fn().mockReturnValue(true),
          cannot: jest.fn().mockReturnValue(false),
        },
      },
      i18next: { t: jest.fn((key: string) => key) },
      timeZone: 'UTC',
    } as unknown as Context;
  });

  describe('New resource fields', () => {
    it('should grant resource-level roles and auto-granted roles on a new field', async () => {
      await editForm.resolve(
        null,
        { id: form.id, structure: structureWith(['name', 'country']) },
        context
      );
      const updated = await Resource.findById(resource.id);
      const country = updated.fields.find((f: any) => f.name === 'country');
      expect(country).toBeDefined();
      // A: resource-level access, B: sees records, D: creates records
      expect(ids(country.permissions.canSee)).toEqual(
        ids([roleA, roleB, roleD])
      );
      // A: resource-level access, D: creates records
      expect(ids(country.permissions.canUpdate)).toEqual(ids([roleA, roleD]));
    });

    it('should not grant a role that opted out of auto-grant', async () => {
      await editForm.resolve(
        null,
        { id: form.id, structure: structureWith(['name', 'country']) },
        context
      );
      const updated = await Resource.findById(resource.id);
      const country = updated.fields.find((f: any) => f.name === 'country');
      expect(ids(country.permissions.canSee)).not.toContain(String(roleC));
    });

    it('should keep the permissions of existing fields', async () => {
      await editForm.resolve(
        null,
        { id: form.id, structure: structureWith(['name', 'country']) },
        context
      );
      const updated = await Resource.findById(resource.id);
      const name = updated.fields.find((f: any) => f.name === 'name');
      expect(ids(name.permissions.canSee)).toEqual(ids([roleA]));
      expect(ids(name.permissions.canUpdate)).toEqual(ids([roleA]));
    });

    it('should apply the same defaults to every new field', async () => {
      await editForm.resolve(
        null,
        {
          id: form.id,
          structure: structureWith(['name', 'country', 'city']),
        },
        context
      );
      const updated = await Resource.findById(resource.id);
      const country = updated.fields.find((f: any) => f.name === 'country');
      const city = updated.fields.find((f: any) => f.name === 'city');
      expect(ids(city.permissions.canSee)).toEqual(
        ids(country.permissions.canSee)
      );
      expect(ids(city.permissions.canUpdate)).toEqual(
        ids(country.permissions.canUpdate)
      );
    });
  });

  it('should not rewrite schema fields for a Field history-only change', async () => {
    const standaloneForm = await Form.create({
      name: `Standalone Form ${counter}`,
      graphQLTypeName: `StandaloneForm${counter}`,
      core: false,
      structure: structureWith(['name']),
      fields: [
        {
          type: 'text',
          name: 'name',
          isRequired: false,
          readOnly: false,
          isCore: false,
        },
      ],
    });
    const updateSpy = jest.spyOn(Form, 'findByIdAndUpdate');

    await editForm.resolve(
      null,
      { id: standaloneForm.id, structure: structureWithFieldHistory() },
      context
    );

    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy.mock.calls[0][1]).not.toHaveProperty('fields');
    updateSpy.mockRestore();
  });

  it('should not rewrite inherited schema fields for a Field history-only change', async () => {
    const permissions = { canSee: [roleA], canUpdate: [roleA] };
    const resourceField = {
      type: 'text',
      name: 'name',
      isRequired: false,
      readOnly: false,
      isCore: true,
      permissions,
    };
    await Resource.findByIdAndUpdate(resource.id, { fields: [resourceField] });
    await Form.findByIdAndUpdate(form.id, { fields: [resourceField] });
    const childField = { ...resourceField, defaultValue: 'Child default' };
    const child = await Form.create({
      name: `Child Form ${counter}`,
      graphQLTypeName: `ChildForm${counter}`,
      core: false,
      resource: resource._id,
      structure: JSON.stringify({
        pages: [
          {
            name: 'page1',
            elements: [
              {
                type: 'text',
                name: 'name',
                valueName: 'name',
                defaultValue: 'Child default',
              },
            ],
          },
        ],
      }),
      fields: [childField],
    });
    const formUpdateSpy = jest.spyOn(Form, 'findByIdAndUpdate');
    const bulkWriteSpy = jest.spyOn(Form, 'bulkWrite');
    const resourceUpdateSpy = jest.spyOn(Resource, 'findByIdAndUpdate');

    await editForm.resolve(
      null,
      { id: form.id, structure: structureWithFieldHistory() },
      context
    );

    expect(formUpdateSpy).toHaveBeenCalledTimes(1);
    expect(formUpdateSpy.mock.calls[0][1]).not.toHaveProperty('fields');
    expect(resourceUpdateSpy).not.toHaveBeenCalled();
    expect(bulkWriteSpy).not.toHaveBeenCalled();
    const unchangedChild = await Form.findById(child.id);
    expect(ids(unchangedChild.fields[0].permissions.canSee)).toEqual(
      ids(permissions.canSee)
    );
    expect(unchangedChild.fields[0].defaultValue).toBe('Child default');
    formUpdateSpy.mockRestore();
    bulkWriteSpy.mockRestore();
    resourceUpdateSpy.mockRestore();
  });
});
